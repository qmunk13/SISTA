import { MASTER_TABLES_60, TableSchema } from '../data/masterDatabase60';
import { db } from '../data/db';
import { Student } from '../types';
import { getAllAppDataForSync } from '../data/syncAllData';

export interface FieldAuditIssue {
  field: string;
  fieldLabel: string;
  value: any;
  issueType: 'empty' | 'invalid' | 'warning';
  message: string;
  suggestion?: string;
}

export interface RecordAuditResult {
  recordId: string;
  primaryValue: string;
  rowNumber: number;
  tableName: string;
  issues: FieldAuditIssue[];
  hasEmpty: boolean;
  hasInvalid: boolean;
  score: number; // 0 - 100%
  rawData: Record<string, any>;
}

export interface SheetAuditSummary {
  tableName: string;
  sheetNumber: number;
  category: string;
  description: string;
  primaryKey: string;
  headers: string[];
  totalRecords: number;
  validRecordsCount: number;
  emptyIssuesCount: number;
  invalidIssuesCount: number;
  overallHealthScore: number; // 0 - 100%
  criticalIssueFields: string[];
  recordsWithIssues: RecordAuditResult[];
  allRecords: RecordAuditResult[];
}

export interface GlobalAuditResult {
  timestamp: string;
  totalSheetsScanned: number;
  totalRecordsScanned: number;
  totalEmptyFieldsFound: number;
  totalInvalidFieldsFound: number;
  overallSystemHealth: number;
  sheetsSummary: SheetAuditSummary[];
}

/**
 * Intelligent helper to extract record field value with alias resolution
 */
export function resolveRecordField(rec: Record<string, any>, header: string, _tableName?: string): any {
  if (!rec || typeof rec !== 'object') return '';

  // 1. Direct key match
  if (rec[header] !== undefined && rec[header] !== null && rec[header] !== '') {
    return rec[header];
  }

  const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 2. Case-insensitive / normalized key match
  for (const k of Object.keys(rec)) {
    if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanHeader) {
      if (rec[k] !== undefined && rec[k] !== null && rec[k] !== '') {
        return rec[k];
      }
    }
  }

  // 3. Known domain aliases
  const h = cleanHeader;

  // Primary Keys / IDs
  if (h.endsWith('id') || h === 'id' || h === 'key' || h === 'kode') {
    if (rec.id !== undefined && rec.id !== '') return rec.id;
    if (rec.ID !== undefined && rec.ID !== '') return rec.ID;
    if (rec._id !== undefined && rec._id !== '') return rec._id;
  }

  // Tanggal / Date
  if (h === 'tanggal' || h === 'tgl' || h === 'date' || h === 'tglpresensi' || h.endsWith('date') || h.endsWith('tgl') || h.startsWith('tanggal')) {
    if (rec.date !== undefined && rec.date !== '') return rec.date;
    if (rec.Tanggal !== undefined && rec.Tanggal !== '') return rec.Tanggal;
    if (rec.tanggal !== undefined && rec.tanggal !== '') return rec.tanggal;
    if (rec.tgl !== undefined && rec.tgl !== '') return rec.tgl;
    if (rec.birthDate !== undefined && rec.birthDate !== '') return rec.birthDate;
    if (rec.createdDate !== undefined && rec.createdDate !== '') return rec.createdDate;
  }

  // Siswa ID
  if (h === 'siswaid' || h === 'nopdkt' || h === 'pdkt' || h === 'studentid') {
    if (rec.studentId !== undefined && rec.studentId !== '') return rec.studentId;
    if (rec.siswaId !== undefined && rec.siswaId !== '') return rec.siswaId;
    if (rec.SiswaID !== undefined && rec.SiswaID !== '') return rec.SiswaID;
    if (rec.noPdkt !== undefined && rec.noPdkt !== '') return rec.noPdkt;
    if (rec.pdkt !== undefined && rec.pdkt !== '') return rec.pdkt;
    if (rec.nis !== undefined && rec.nis !== '') return rec.nis;
  }

  // Nama Siswa / Nama
  if (h === 'namasiswa' || h === 'namalengkap' || h === 'nama' || h === 'name' || h === 'studentname') {
    if (rec.NamaSiswa !== undefined && rec.NamaSiswa !== '') return rec.NamaSiswa;
    if (rec.name !== undefined && rec.name !== '') return rec.name;
    if (rec.NamaLengkap !== undefined && rec.NamaLengkap !== '') return rec.NamaLengkap;
    if (rec.nama !== undefined && rec.nama !== '') return rec.nama;
    if (rec.Nama !== undefined && rec.Nama !== '') return rec.Nama;
    if (rec.namaSiswa !== undefined && rec.namaSiswa !== '') return rec.namaSiswa;
    if (rec.studentName !== undefined && rec.studentName !== '') return rec.studentName;
  }

  // NISN
  if (h === 'nisn') {
    if (rec.NISN !== undefined && rec.NISN !== '') return rec.NISN;
    if (rec.nisn !== undefined && rec.nisn !== '') return rec.nisn;
  }

  // Kelas / KelasID / NamaKelas
  if (h === 'kelas' || h === 'kelasid' || h === 'namakelas' || h === 'class' || h === 'rombel') {
    if (rec.KelasID !== undefined && rec.KelasID !== '') return rec.KelasID;
    if (rec.NamaKelas !== undefined && rec.NamaKelas !== '') return rec.NamaKelas;
    if (rec.class !== undefined && rec.class !== '') return rec.class;
    if (rec.className !== undefined && rec.className !== '') return rec.className;
    if (rec.kelas !== undefined && rec.kelas !== '') return rec.kelas;
    if (rec.Kelas !== undefined && rec.Kelas !== '') return rec.Kelas;
    if (rec.kelasId !== undefined && rec.kelasId !== '') return rec.kelasId;
    if (rec.rombel !== undefined && rec.rombel !== '') return rec.rombel;
  }

  // Jam / Waktu Masuk & Pulang
  if (h === 'jammasuk' || h === 'waktumasuk' || h === 'jam' || h === 'time') {
    if (rec.JamMasuk !== undefined && rec.JamMasuk !== '') return rec.JamMasuk;
    if (rec.time !== undefined && rec.time !== '') return rec.time;
    if (rec.jam !== undefined && rec.jam !== '') return rec.jam;
    if (rec.jamMasuk !== undefined && rec.jamMasuk !== '') return rec.jamMasuk;
  }
  if (h === 'jampulang' || h === 'waktupulang') {
    if (rec.JamPulang !== undefined && rec.JamPulang !== '') return rec.JamPulang;
    if (rec.jamPulang !== undefined && rec.jamPulang !== '') return rec.jamPulang;
    if (rec.checkout !== undefined && rec.checkout !== '') return rec.checkout;
  }

  // Guru / GuruID / NamaGuru
  if (h === 'guruid' || h === 'teacherid') {
    if (rec.GuruID !== undefined && rec.GuruID !== '') return rec.GuruID;
    if (rec.teacherId !== undefined && rec.teacherId !== '') return rec.teacherId;
    if (rec.guruId !== undefined && rec.guruId !== '') return rec.guruId;
    if (rec.nip !== undefined && rec.nip !== '') return rec.nip;
  }
  if (h === 'namaguru' || h === 'teachername') {
    if (rec.NamaGuru !== undefined && rec.NamaGuru !== '') return rec.NamaGuru;
    if (rec.teacherName !== undefined && rec.teacherName !== '') return rec.teacherName;
    if (rec.namaGuru !== undefined && rec.namaGuru !== '') return rec.namaGuru;
    if (rec.guru !== undefined && rec.guru !== '') return rec.guru;
  }

  // Mapel / MapelID / NamaMapel
  if (h === 'mapelid' || h === 'subjectid') {
    if (rec.MapelID !== undefined && rec.MapelID !== '') return rec.MapelID;
    if (rec.subjectId !== undefined && rec.subjectId !== '') return rec.subjectId;
    if (rec.mapelId !== undefined && rec.mapelId !== '') return rec.mapelId;
  }
  if (h === 'namamapel' || h === 'mapel' || h === 'subjectname') {
    if (rec.NamaMapel !== undefined && rec.NamaMapel !== '') return rec.NamaMapel;
    if (rec.subjectName !== undefined && rec.subjectName !== '') return rec.subjectName;
    if (rec.namaMapel !== undefined && rec.namaMapel !== '') return rec.namaMapel;
    if (rec.mapel !== undefined && rec.mapel !== '') return rec.mapel;
  }

  // Status
  if (h === 'status' || h === 'st' || h === 'keaktifan') {
    if (rec.Status !== undefined && rec.Status !== '') return rec.Status;
    if (rec.status !== undefined && rec.status !== '') {
      if (rec.status === 'H') return 'Hadir';
      if (rec.status === 'S') return 'Sakit';
      if (rec.status === 'I') return 'Izin';
      if (rec.status === 'A') return 'Alpa';
      if (rec.status === 'T') return 'Terlambat';
      return rec.status;
    }
  }

  // Keterangan / Note
  if (h === 'keterangan' || h === 'catatan' || h === 'note' || h === 'deskripsi' || h === 'description') {
    if (rec.Keterangan !== undefined && rec.Keterangan !== '') return rec.Keterangan;
    if (rec.note !== undefined && rec.note !== '') return rec.note;
    if (rec.catatan !== undefined && rec.catatan !== '') return rec.catatan;
    if (rec.keterangan !== undefined && rec.keterangan !== '') return rec.keterangan;
    if (rec.description !== undefined && rec.description !== '') return rec.description;
  }

  // Nominal / Biaya / Jumlah
  if (h === 'nominal' || h === 'jumlah' || h === 'amount' || h === 'total' || h === 'biaya' || h === 'saldo') {
    if (rec.Nominal !== undefined && rec.Nominal !== '') return rec.Nominal;
    if (rec.amount !== undefined && rec.amount !== '') return rec.amount;
    if (rec.nominal !== undefined && rec.nominal !== '') return rec.nominal;
    if (rec.total !== undefined && rec.total !== '') return rec.total;
    if (rec.jumlah !== undefined && rec.jumlah !== '') return rec.jumlah;
    if (rec.biaya !== undefined && rec.biaya !== '') return rec.biaya;
  }

  // Petugas / Operator
  if (h === 'petugasid' || h === 'recordedby' || h === 'operator') {
    if (rec.PetugasID !== undefined && rec.PetugasID !== '') return rec.PetugasID;
    if (rec.recordedBy !== undefined && rec.recordedBy !== '') return rec.recordedBy;
    if (rec.petugasId !== undefined && rec.petugasId !== '') return rec.petugasId;
    if (rec.operator !== undefined && rec.operator !== '') return rec.operator;
  }

  // QRCode
  if (h === 'qrcode' || h === 'qr') {
    if (rec.QRCode !== undefined && rec.QRCode !== '') return rec.QRCode;
    if (rec.qrCode !== undefined && rec.qrCode !== '') return rec.qrCode;
  }

  return '';
}

/**
 * Intelligent helper to check whether a string value is considered empty
 */
export function isValueEmpty(val: any): boolean {
  if (val === undefined || val === null) return true;
  const str = String(val).trim();
  if (str === '' || str === '-' || str === '--' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'n/a') {
    return true;
  }
  return false;
}

/**
 * Intelligent field validator based on header name conventions
 */
export function validateField(header: string, rawVal: any, record: Record<string, any>, tableName: string): { isValid: boolean; issueType?: 'empty' | 'invalid' | 'warning'; message?: string; suggestion?: string } {
  const hClean = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

  // 1. Check if empty
  if (isValueEmpty(rawVal)) {
    // Determine if this field is critical or optional
    const isCritical = isCriticalField(header, tableName);
    return {
      isValid: false,
      issueType: 'empty',
      message: `Kolom '${header}' masih kosong (${isCritical ? 'Kolom Wajib/Krusial' : 'Perlu Dilengkapi'})`,
      suggestion: `Isi data '${header}' sesuai dokumen resmi atau catatan lembaga.`
    };
  }

  // 2. Format & Value Validations
  // A. NIK (16 Digit Numerik)
  if (hClean.includes('nik') && !hClean.includes('teknik') && !hClean.includes('elektronik') && !hClean.includes('unik')) {
    const cleanNik = valStr.replace(/[-.\s]/g, '');
    if (!/^\d{16}$/.test(cleanNik)) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: `NIK tidak valid (${cleanNik.length} digit, standar Dukcapil wajib tepat 16 digit angka)`,
        suggestion: 'Pastikan NIK berisi 16 digit numerik dari KTP/Kartu Keluarga.'
      };
    }
    if (/^0{16}$|^1{16}$|^2{16}$|^3{16}$|^4{16}$|^5{16}$|^6{16}$|^7{16}$|^8{16}$|^9{16}$|^1234567890123456$/.test(cleanNik)) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: 'NIK terdeteksi menggunakan angka dummy / berulang',
        suggestion: 'Ganti dengan nomor NIK resmi dari Dukcapil.'
      };
    }
  }

  // B. NISN (10 Digit Numerik)
  if (hClean.includes('nisn')) {
    const cleanNisn = valStr.replace(/\D/g, '');
    if (!/^\d{10}$/.test(cleanNisn)) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: `NISN tidak valid (${cleanNisn.length} digit, standar Kemdikbudristek wajib tepat 10 digit angka)`,
        suggestion: 'Pastikan NISN berisi 10 digit angka dari laman resmi Verval PD/Kemdikbud.'
      };
    }
    if (/^0{10}$|^1{10}$|^2{10}$|^3{10}$|^4{10}$|^5{10}$|^6{10}$|^7{10}$|^8{10}$|^9{10}$|^1234567890$/.test(cleanNisn)) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: 'NISN terdeteksi menggunakan angka dummy / berulang',
        suggestion: 'Ganti dengan NISN aktif siswa di Pusdatin Kemdikbud.'
      };
    }
  }

  // C. No KK (16 Digit Numerik)
  if (hClean === 'nokk' || hClean === 'nomorkartukeluarga' || hClean === 'kartukeluarga' && /^\d+$/.test(valStr)) {
    const cleanKk = valStr.replace(/[-.\s]/g, '');
    if (cleanKk.length !== 16 && cleanKk.length > 0) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: `Nomor Kartu Keluarga tidak 16 digit (${cleanKk.length} digit)`,
        suggestion: 'Periksa nomor KK 16 digit pada lembar Kartu Keluarga asli.'
      };
    }
  }

  // D. Tanggal Lahir / Tanggal (Format Validasi Tanggal)
  if (hClean.includes('tanggal') || hClean.includes('tgl') || hClean === 'dob' || hClean === 'tmt' || hClean.includes('jatuhtempo')) {
    // Check common valid date formats: YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(valStr);
    const isSlashDate = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valStr);
    const isDashDate = /^\d{1,2}-\d{1,2}-\d{4}$/.test(valStr);
    const isValidParsed = !isNaN(Date.parse(valStr));

    if (!isIsoDate && !isSlashDate && !isDashDate && !isValidParsed) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: `Format tanggal tidak dikenali ('${valStr}'). Standar yang dianjurkan: YYYY-MM-DD (Contoh: 2008-04-14)`,
        suggestion: 'Ubah format tanggal menjadi YYYY-MM-DD atau pilih dari pemilih tanggal.'
      };
    }
  }

  // E. Nomor HP / Telepon / WA (Deteksi spesifik agar tidak salah mengenali kata seperti 'TingkatAwal', 'Karyawan', dll.)
  const isPhoneField =
    hClean === 'nohp' ||
    hClean === 'hp' ||
    hClean === 'telepon' ||
    hClean === 'telp' ||
    hClean === 'notelp' ||
    hClean === 'notelepon' ||
    hClean === 'phone' ||
    hClean === 'phonenumber' ||
    hClean === 'mobile' ||
    hClean === 'kontak' ||
    hClean === 'wa' ||
    hClean === 'nowa' ||
    hClean === 'whatsapp' ||
    hClean === 'nomorwa' ||
    hClean === 'nomorhp' ||
    hClean === 'nomortelepon' ||
    hClean === 'kontakwali' ||
    hClean === 'kontakortu' ||
    hClean === 'kontakdarurat' ||
    hClean === 'teleponwali' ||
    hClean === 'teleponortu' ||
    hClean === 'nohportu' ||
    hClean === 'nohpwali' ||
    hClean === 'nohpguru' ||
    hClean === 'walitelepon' ||
    hClean.endsWith('telepon') ||
    hClean.endsWith('notelp') ||
    hClean.endsWith('nohp') ||
    hClean.endsWith('nowa') ||
    hClean.endsWith('phone') ||
    hClean.startsWith('nohp') ||
    hClean.startsWith('notelp') ||
    hClean.startsWith('telepon') ||
    hClean.startsWith('whatsapp');

  if (isPhoneField) {
    const cleanPhone = valStr.replace(/[-.\s+]/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: `Nomor telepon/HP tidak lazim ('${valStr}', ${cleanPhone.length} digit)`,
        suggestion: 'Gunakan nomor telepon valid (10-13 digit, contoh: 081234567890).'
      };
    }
  }

  // F. Email Address
  if (hClean.includes('email') || hClean.includes('mail')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: `Format alamat email tidak valid ('${valStr}')`,
        suggestion: 'Format email harus mengandung nama akun, tanda @, dan domain (contoh: siswa@gmail.com).'
      };
    }
  }

  // G. Jenis Kelamin (L/P/Laki-laki/Perempuan)
  if (hClean === 'jeniskelamin' || hClean === 'jk' || hClean === 'gender') {
    const validGenders = ['l', 'p', 'laki-laki', 'perempuan', 'laki - laki', 'pria', 'wanita'];
    if (!validGenders.includes(valStr.toLowerCase())) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: `Jenis kelamin tidak standar ('${valStr}'). Standar Dapodik: 'L' (Laki-laki) atau 'P' (Perempuan)`,
        suggestion: "Ubah menjadi 'L' untuk Laki-laki atau 'P' untuk Perempuan."
      };
    }
  }

  // H. Nominal / Angka Keuangan (Nominal, Tarif, Biaya, Saldo, Debit, Kredit)
  if (hClean.includes('nominal') || hClean.includes('tarif') || hClean.includes('biaya') || hClean.includes('saldo') || hClean.includes('debit') || hClean.includes('kredit') || hClean.includes('totalbayar')) {
    const cleanNum = valStr.replace(/[^\d.-]/g, '');
    if (isNaN(Number(cleanNum))) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: `Nilai keuangan harus berupa angka numerik ('${valStr}')`,
        suggestion: 'Masukkan angka bilangan bulat/desimal tanpa huruf.'
      };
    }
  }

  // I. Nilai / KKM / Skor (0 - 100)
  if (hClean === 'nilai' || hClean === 'kkm' || hClean === 'skor' || hClean === 'skorseleksi' || hClean.includes('nilaiuts') || hClean.includes('nilaiuas') || hClean.includes('nilaitugas')) {
    const num = Number(valStr);
    if (isNaN(num) || num < 0 || num > 100) {
      return {
        isValid: false,
        issueType: 'invalid',
        message: `Nilai/Skor ('${valStr}') di luar rentang standar (0 - 100)`,
        suggestion: 'Rentang nilai baku akademik adalah 0 sampai 100.'
      };
    }
  }

  return { isValid: true };
}

/**
 * Determine if a field is considered critical for the table
 */
function isCriticalField(header: string, tableName: string): boolean {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = tableName.toUpperCase();

  if (h.includes('id') || h.includes('kode') || h.includes('nama') || h.includes('name')) return true;
  if (t === 'SISWA') {
    return ['nopdkt', 'nis', 'nisn', 'nik', 'namalengkap', 'jeniskelamin', 'tanggallahir', 'tempatlahir', 'namaibu', 'namaayah', 'kelassaatini', 'kelas', 'alamat'].includes(h);
  }
  if (t === 'ORANG_TUA') {
    return ['siswaid', 'namasiswa', 'hubungan', 'nama', 'nik'].includes(h);
  }
  if (t === 'YATIM_PIATU') {
    return ['nopdkt', 'namasiswa', 'statusyatim'].includes(h);
  }
  if (t === 'GURU') {
    return ['guruid', 'nama', 'nik', 'jeniskelamin', 'statuskepegawaian'].includes(h);
  }
  if (t === 'KELAS') {
    return ['kelasid', 'namakelas', 'tingkat', 'jenjangid'].includes(h);
  }
  if (t === 'MAPEL') {
    return ['mapelid', 'namamapel', 'kkm', 'kelompok'].includes(h);
  }
  if (t.includes('SPMB')) {
    return ['noreg', 'namacalonsiswa', 'nisn', 'jalurmasuk'].some(k => h.includes(k));
  }
  if (t === 'TAGIHAN' || t === 'PEMBAYARAN') {
    return ['siswaid', 'namasiswa', 'nominal', 'status'].some(k => h.includes(k));
  }
  return false;
}

/**
 * Primary Audit Function for a specific Table/Sheet
 */
export function auditTableData(table: TableSchema, rawRecords: any[]): SheetAuditSummary {
  const records = Array.isArray(rawRecords) ? rawRecords : [];
  const recordsWithIssues: RecordAuditResult[] = [];
  const allRecords: RecordAuditResult[] = [];

  let emptyIssuesCount = 0;
  let invalidIssuesCount = 0;
  let validRecordsCount = 0;
  const criticalFieldsSet = new Set<string>();

  records.forEach((rec, idx) => {
    const issues: FieldAuditIssue[] = [];
    const pk = table.primaryKey || 'id';
    const recordId = String(rec[pk] || rec.id || rec.ID || rec.NoPDKT || rec.nis || rec.SiswaID || `ROW-${idx + 1}`);
    const primaryValue = String(rec.NamaLengkap || rec.Nama || rec.name || rec.NamaSiswa || rec.NamaCalonSiswa || rec.NamaMapel || rec.NamaKelas || rec.Judul || recordId);

    // Audit every header in the schema
    table.headers.forEach(header => {
      // Find value matching header case-insensitively
      let val = rec[header];
      if (val === undefined) {
        const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const k of Object.keys(rec)) {
          if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanHeader) {
            val = rec[k];
            break;
          }
        }
      }

      const validation = validateField(header, val, rec, table.name);
      if (!validation.isValid && validation.issueType) {
        if (validation.issueType === 'empty') {
          emptyIssuesCount++;
          if (isCriticalField(header, table.name)) {
            criticalFieldsSet.add(header);
          }
        } else if (validation.issueType === 'invalid') {
          invalidIssuesCount++;
          criticalFieldsSet.add(header);
        }

        issues.push({
          field: header,
          fieldLabel: header,
          value: val,
          issueType: validation.issueType,
          message: validation.message || `Format ${header} tidak valid`,
          suggestion: validation.suggestion
        });
      }
    });

    const totalFields = table.headers.length || 1;
    const cleanFields = Math.max(0, totalFields - issues.length);
    const score = Math.round((cleanFields / totalFields) * 100);

    const recordAudit: RecordAuditResult = {
      recordId,
      primaryValue,
      rowNumber: idx + 2, // 1-indexed plus header row
      tableName: table.name,
      issues,
      hasEmpty: issues.some(i => i.issueType === 'empty'),
      hasInvalid: issues.some(i => i.issueType === 'invalid'),
      score,
      rawData: rec
    };

    allRecords.push(recordAudit);

    if (issues.length > 0) {
      recordsWithIssues.push(recordAudit);
    } else {
      validRecordsCount++;
    }
  });

  const totalPossibleChecks = (records.length * (table.headers.length || 1)) || 1;
  const totalErrors = emptyIssuesCount + (invalidIssuesCount * 2);
  const rawHealth = Math.round(Math.max(0, 100 - ((totalErrors / totalPossibleChecks) * 100)));
  const overallHealthScore = records.length === 0 ? 100 : rawHealth;

  return {
    tableName: table.name,
    sheetNumber: table.id,
    category: table.category,
    description: table.description,
    primaryKey: table.primaryKey,
    headers: table.headers,
    totalRecords: records.length,
    validRecordsCount,
    emptyIssuesCount,
    invalidIssuesCount,
    overallHealthScore,
    criticalIssueFields: Array.from(criticalFieldsSet),
    recordsWithIssues,
    allRecords
  };
}

/**
 * Helper to fetch live records for any of the 88 master tables
 */
export function getTableRecords(tableName: string, students: Student[], teachers: any[]): any[] {
  const tName = tableName.toUpperCase();

  if (tName === 'SISWA') {
    return students;
  }
  if (tName === 'GURU') {
    const fromDb = db.get('teachers');
    return teachers.length > 0 ? teachers : (fromDb.length > 0 ? fromDb : []);
  }
  if (tName === 'ORANG_TUA') {
    const fromDb = db.get('parents');
    if (fromDb.length > 0) {
      return fromDb;
    }
    // Reconstruct from students
    const parentRecords: any[] = [];
    students.forEach(s => {
      if (s.namaAyah || s.fatherName) {
        parentRecords.push({
          OrtuID: `ORTU-AYAH-${s.id}`,
          SiswaID: s.id,
          NamaSiswa: s.name,
          NISN: s.nisn || '-',
          Hubungan: 'Ayah Kandung',
          Nama: s.namaAyah || s.fatherName,
          NIK: s.nikAyah || '-',
          TempatLahir: s.tempatLahirAyah || '-',
          TanggalLahir: s.tanggalLahirAyah || '-',
          Pekerjaan: s.pekerjaanAyah || s.fatherJob || '-',
          Pendidikan: s.pendidikanAyah || '-',
          NoHP: s.tlpAyah || s.parentPhone || '-',
          Alamat: s.address || '-',
          StatusHidup: s.statusAyah || 'Masih Hidup'
        });
      }
      if (s.namaIbu || s.NamaIbu) {
        parentRecords.push({
          OrtuID: `ORTU-IBU-${s.id}`,
          SiswaID: s.id,
          NamaSiswa: s.name,
          NISN: s.nisn || '-',
          Hubungan: 'Ibu Kandung',
          Nama: s.namaIbu || s.NamaIbu,
          NIK: s.nikIbu || '-',
          TempatLahir: s.tempatLahirIbu || '-',
          TanggalLahir: s.tanggalLahirIbu || '-',
          Pekerjaan: s.pekerjaanIbu || s.motherJob || '-',
          Pendidikan: s.pendidikanIbu || '-',
          NoHP: s.tlpIbu || s.parentPhone || '-',
          Alamat: s.address || '-',
          StatusHidup: s.statusIbu || 'Masih Hidup'
        });
      }
    });
    return parentRecords;
  }
  if (tName === 'YATIM_PIATU') {
    const fromDb = db.get('yatim');
    if (fromDb.length > 0) {
      return fromDb;
    }
    return students.map(s => ({
      YatimID: `YTM-${s.id}`,
      NoPDKT: s.id,
      NISN: s.nisn || '-',
      NamaSiswa: s.name,
      Kelas: s.class,
      StatusYatim: s.statusYatim || 'Lengkap',
      NamaAyah: s.namaAyah || s.fatherName || '-',
      StatusAyah: s.statusAyah || 'Masih Hidup',
      NamaIbu: s.namaIbu || s.NamaIbu || '-',
      StatusIbu: s.statusIbu || 'Masih Hidup',
      NamaWali: s.namaWali || '-',
      NoHPWali: s.tlpWali || s.parentPhone || '-',
      Alamat: s.address || '-',
      PenerimaKPS_PIP: s.penerimaKps || 'Tidak'
    }));
  }

  // General DB lookups with fallback key variations
  const keyCandidates = [
    tableName.toLowerCase(),
    tableName.toLowerCase().replace(/_/g, ''),
    tableName.toLowerCase().replace(/_/g, '-'),
    tableName
  ];
  for (const k of keyCandidates) {
    const found = db.get(k);
    if (Array.isArray(found) && found.length > 0) {
      return found;
    }
  }
  return [];
}

/**
 * Universal Record Update & Sync Engine
 * Updates the record in its appropriate database table, syncs cross-referenced student data,
 * and appends an audit log entry.
 */
export function saveAndSyncTableRecord(
  tableName: string,
  recordId: string,
  updatedData: Record<string, any>,
  students: Student[],
  teachers: any[],
  updateStudentFn?: (id: string, data: any) => void,
  updateTeacherFn?: (id: string, data: any) => void
): boolean {
  const tName = tableName.toUpperCase();
  const nowIso = new Date().toISOString();

  // 1. If Sheet is SISWA
  if (tName === 'SISWA') {
    const studentMatch = students.find(s => 
      s.id === recordId || 
      s.nis === recordId || 
      s.nopdkt === recordId || 
      (updatedData.nopdkt && s.nopdkt === updatedData.nopdkt) ||
      (updatedData.NIS && s.nis === updatedData.NIS)
    );

    const targetId = studentMatch ? studentMatch.id : recordId;
    if (updateStudentFn) {
      updateStudentFn(targetId, updatedData);
    } else {
      const allStudents = db.get<Student>('students');
      const updatedList = allStudents.map(s => {
        if (s.id === targetId || s.nopdkt === targetId || s.nis === targetId) {
          return { ...s, ...updatedData };
        }
        return s;
      });
      db.set('students', updatedList);
    }
  } 
  // 2. If Sheet is GURU
  else if (tName === 'GURU') {
    const targetId = updatedData.id || updatedData.GuruID || updatedData.NIP || recordId;
    if (updateTeacherFn) {
      updateTeacherFn(targetId, updatedData);
    } else {
      const allTeachers = db.get('teachers');
      const updatedList = allTeachers.map((t: any) => {
        if (t.id === targetId || t.GuruID === targetId || t.nip === targetId) {
          return { ...t, ...updatedData };
        }
        return t;
      });
      db.set('teachers', updatedList);
    }
  }
  // 3. If Sheet is ORANG_TUA
  else if (tName === 'ORANG_TUA') {
    let parents = db.get('parents');
    if (parents.length === 0) {
      parents = getTableRecords('ORANG_TUA', students, teachers);
    }
    const idx = parents.findIndex((p: any) => p.OrtuID === recordId || p.SiswaID === recordId || p.Nama === recordId);
    if (idx >= 0) {
      parents[idx] = { ...parents[idx], ...updatedData, UpdatedAt: nowIso };
    } else {
      parents.push({ ...updatedData, OrtuID: recordId, CreatedAt: nowIso, UpdatedAt: nowIso });
    }
    db.set('parents', parents);

    // Cross-sync to student if SiswaID or NISN matches
    const siswaId = updatedData.SiswaID || (parents[idx] && parents[idx].SiswaID);
    if (siswaId && updateStudentFn) {
      const hub = String(updatedData.Hubungan || '').toLowerCase();
      if (hub.includes('ayah')) {
        updateStudentFn(siswaId, {
          namaAyah: updatedData.Nama,
          NamaAyah: updatedData.Nama,
          fatherName: updatedData.Nama,
          nikAyah: updatedData.NIK,
          NIKAyah: updatedData.NIK,
          tempatLahirAyah: updatedData.TempatLahir,
          tanggalLahirAyah: updatedData.TanggalLahir,
          pekerjaanAyah: updatedData.Pekerjaan,
          pendidikanAyah: updatedData.Pendidikan,
          tlpAyah: updatedData.NoHP,
          statusAyah: updatedData.StatusHidup
        });
      } else if (hub.includes('ibu')) {
        updateStudentFn(siswaId, {
          namaIbu: updatedData.Nama,
          NamaIbu: updatedData.Nama,
          namaIbuKandung: updatedData.Nama,
          nikIbu: updatedData.NIK,
          NIKIbu: updatedData.NIK,
          tempatLahirIbu: updatedData.TempatLahir,
          tanggalLahirIbu: updatedData.TanggalLahir,
          pekerjaanIbu: updatedData.Pekerjaan,
          pendidikanIbu: updatedData.Pendidikan,
          tlpIbu: updatedData.NoHP,
          statusIbu: updatedData.StatusHidup
        });
      }
    }
  }
  // 4. If Sheet is YATIM_PIATU
  else if (tName === 'YATIM_PIATU') {
    let yatimList = db.get('yatim');
    if (yatimList.length === 0) {
      yatimList = getTableRecords('YATIM_PIATU', students, teachers);
    }
    const idx = yatimList.findIndex((y: any) => y.YatimID === recordId || y.NoPDKT === recordId || y.NamaSiswa === recordId);
    if (idx >= 0) {
      yatimList[idx] = { ...yatimList[idx], ...updatedData, UpdatedAt: nowIso };
    } else {
      yatimList.push({ ...updatedData, YatimID: recordId, CreatedAt: nowIso, UpdatedAt: nowIso });
    }
    db.set('yatim', yatimList);

    // Cross-sync to student
    const studentId = updatedData.NoPDKT || (yatimList[idx] && yatimList[idx].NoPDKT);
    if (studentId && updateStudentFn) {
      updateStudentFn(studentId, {
        statusYatim: updatedData.StatusYatim,
        StatusYatim: updatedData.StatusYatim,
        namaAyah: updatedData.NamaAyah,
        statusAyah: updatedData.StatusAyah,
        namaIbu: updatedData.NamaIbu,
        statusIbu: updatedData.StatusIbu,
        namaWali: updatedData.NamaWali,
        tlpWali: updatedData.NoHPWali,
        penerimaKps: updatedData.PenerimaKPS_PIP
      });
    }
  }
  // 5. Generic Master Table
  else {
    const tableKey = tableName.toLowerCase();
    let currentRows = db.get(tableKey);
    if (currentRows.length === 0) {
      currentRows = getTableRecords(tableName, students, teachers);
    }

    const matchIdx = currentRows.findIndex((row: any) => {
      const keys = Object.keys(row);
      return keys.some(k => String(row[k]) === String(recordId));
    });

    if (matchIdx >= 0) {
      currentRows[matchIdx] = { ...currentRows[matchIdx], ...updatedData, UpdatedAt: nowIso };
    } else {
      currentRows.push({ ...updatedData, CreatedAt: nowIso, UpdatedAt: nowIso });
    }
    db.set(tableKey, currentRows);
  }

  // Record into AUDIT_LOG and LOG
  try {
    const auditLogs = db.get('audit_log');
    auditLogs.unshift({
      AuditID: `AUDIT-${Date.now()}`,
      UserID: 'USR-ADMIN',
      Username: 'Administrator',
      Tabel: tableName,
      RecordID: recordId,
      Field: 'Batch / Manual Edit',
      ValueLama: 'Koreksi Data',
      ValueBaru: JSON.stringify(updatedData),
      Tanggal: new Date().toLocaleDateString('id-ID'),
      CreatedAt: nowIso
    });
    db.set('audit_log', auditLogs.slice(0, 100));
  } catch (err) {
    console.warn('Audit logging issue:', err);
  }

  return true;
}

/**
 * Comprehensive System-Wide Audit across all 88 Master Database Tables
 */
export function runComprehensiveSystemAudit(students: Student[], teachers: any[]): GlobalAuditResult {
  let totalEmpty = 0;
  let totalInvalid = 0;
  let totalRecords = 0;

  const sheetsSummary: SheetAuditSummary[] = MASTER_TABLES_60.map(table => {
    const records = getTableRecords(table.name, students, teachers);
    const summary = auditTableData(table, records);
    totalEmpty += summary.emptyIssuesCount;
    totalInvalid += summary.invalidIssuesCount;
    totalRecords += summary.totalRecords;

    return summary;
  });

  const totalChecks = totalRecords * 8; // estimation weight
  const systemHealth = totalRecords === 0 ? 100 : Math.max(10, Math.round(100 - (((totalEmpty * 0.5) + (totalInvalid * 2)) / (totalChecks || 1)) * 100));

  return {
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    totalSheetsScanned: MASTER_TABLES_60.length,
    totalRecordsScanned: totalRecords,
    totalEmptyFieldsFound: totalEmpty,
    totalInvalidFieldsFound: totalInvalid,
    overallSystemHealth: Math.min(100, systemHealth),
    sheetsSummary
  };
}

