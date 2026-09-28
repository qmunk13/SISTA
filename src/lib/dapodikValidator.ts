/**
 * Smart Dapodik & Verval PD Validation Engine 2026/2027
 * Sesuai Standar Integrasi Pusdatin Kemendikbudristek & Ditjen Dukcapil Kemendagri
 */

import { Student, DapodikValidationRecord } from '../types';

export interface DapodikFieldValidation {
  field: string;
  label: string;
  value: string;
  status: 'valid' | 'warning' | 'invalid';
  message: string;
  suggestion?: string;
}

export interface DapodikAuditResult {
  studentId: string;
  nisn: string;
  nik: string;
  noKk: string;
  name: string;
  gender: string;
  class: string;
  birthPlace: string;
  birthDate: string;
  namaIbu: string;
  namaAyah: string;
  tahunMasuk: string;

  // Age & adult categorization
  ageYears?: number;
  isDewasa?: boolean;

  // Duplicate intelligence & operator confirmation
  hasDuplicateNisn?: boolean;
  duplicateNisnWith?: { studentId: string; name: string; class: string };
  isNisnDuplicateApproved?: boolean;

  hasDuplicateNik?: boolean;
  duplicateNikWith?: { studentId: string; name: string; class: string };
  isNikDuplicateApproved?: boolean;

  // Parsed NISN Intelligence (Format ABBXXXYYYY)
  parsedNisn?: {
    raw: string;
    prefixA: string;
    birthYear2DigitBB: string;
    estimatedBirthYear: number;
    codeXXX: string;
    sequenceYYYY: string;
    isValidFormat: boolean;
    matchesStudentDob?: boolean;
    studentDobYear?: string;
  };
  
  // Parsed NIK Intelligence
  parsedNik?: {
    provinceCode: string;
    provinceName: string;
    regencyCode: string;
    districtCode: string;
    parsedGender: 'L' | 'P';
    parsedBirthDate: string; // YYYY-MM-DD
    parsedDay: number;
    parsedMonth: number;
    parsedYear: number;
    isValidFormat: boolean;
  };

  // Field by field audit
  validations: {
    nisn: DapodikFieldValidation;
    nik: DapodikFieldValidation;
    noKk: DapodikFieldValidation;
    nama: DapodikFieldValidation;
    namaIbu: DapodikFieldValidation;
    namaAyah: DapodikFieldValidation;
    tanggalLahir: DapodikFieldValidation;
    tempatLahir: DapodikFieldValidation;
    tahunMasuk: DapodikFieldValidation;
    rombel: DapodikFieldValidation;
  };

  // Overall evaluation
  complianceScore: number; // 0 - 100%
  overallStatus: 'SIAP_SINKRON' | 'PERINGATAN' | 'RESIDU_DAPODIK' | 'BELUM_TERDATA';
  issuesCount: {
    invalid: number;
    warning: number;
    valid: number;
  };
  summaryReason: string;
  suggestions: string[];
}

// Daftar Kode Provinsi Indonesia (Permendagri)
const PROVINSI_MAP: Record<string, string> = {
  '11': 'Aceh',
  '12': 'Sumatera Utara',
  '13': 'Sumatera Barat',
  '14': 'Riau',
  '15': 'Jambi',
  '16': 'Sumatera Selatan',
  '17': 'Bengkulu',
  '18': 'Lampung',
  '19': 'Kep. Bangka Belitung',
  '21': 'Kep. Riau',
  '31': 'DKI Jakarta',
  '32': 'Jawa Barat',
  '33': 'Jawa Tengah',
  '34': 'DI Yogyakarta',
  '35': 'Jawa Timur',
  '36': 'Banten',
  '51': 'Bali',
  '52': 'Nusa Tenggara Barat',
  '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat',
  '62': 'Kalimantan Tengah',
  '63': 'Kalimantan Selatan',
  '64': 'Kalimantan Timur',
  '65': 'Kalimantan Utara',
  '71': 'Sulawesi Utara',
  '72': 'Sulawesi Tengah',
  '73': 'Sulawesi Selatan',
  '74': 'Sulawesi Tenggara',
  '75': 'Gorontalo',
  '76': 'Sulawesi Barat',
  '81': 'Maluku',
  '82': 'Maluku Utara',
  '91': 'Papua Barat',
  '92': 'Papua Barat Daya',
  '93': 'Papua Selatan',
  '94': 'Papua Tengah',
  '95': 'Papua Pegunungan',
  '96': 'Papua'
};

// Placeholder / Invalid Mother Names
const INVALID_MOTHER_PATTERNS = [
  /^(ibu|ibu kandung|ibunya|mama|bunda|umi|ibu siswa|almarhum|almarhumah|alm|none|null|nil|undefined|tidak tahu|tidak ada|nn|-|\.|\?|unknown|anonim)$/i,
  /^[0-9\W_]+$/
];

// Dummy NIK sequences
const DUMMY_NIK_PATTERNS = [
  /^0{16}$/,
  /^1{16}$/,
  /^2{16}$/,
  /^3{16}$/,
  /^4{16}$/,
  /^5{16}$/,
  /^6{16}$/,
  /^7{16}$/,
  /^8{16}$/,
  /^9{16}$/,
  /^1234567890123456$/,
  /^123456789012345\d$/
];

/**
 * Helper to extract 4-digit birth year from any standard date format
 */
export function extractBirthYear(dobStr: string): string | undefined {
  if (!dobStr) return undefined;
  const clean = String(dobStr).trim();
  // 1. YYYY-MM-DD or YYYY/MM/DD
  const matchIso = clean.match(/^(\d{4})[-/]/);
  if (matchIso) return matchIso[1];

  // 2. DD-MM-YYYY or DD/MM/YYYY
  const matchDmy = clean.match(/[-/](\d{4})$/);
  if (matchDmy) return matchDmy[1];

  // 3. Any 4-digit year between 1900-2099
  const matchYear = clean.match(/\b(19\d{2}|20\d{2})\b/);
  if (matchYear) return matchYear[1];

  return undefined;
}

/**
 * Smart NISN Pusdatin Parser (Format ABBXXXYYYY - 10 Karakter Angka)
 * Keterangan:
 * - A   : 1 karakter angka awal (kode awalan registrasi)
 * - BB  : 2 karakter angka menunjukkan tahun lahir siswa
 * - XXX : 3 karakter angka untuk pengelompokan oleh sistem
 * - YYYY: 4 karakter angka nomor urut dalam pengelompokan XXX
 */
export interface ParsedNISN {
  raw: string;
  prefixA: string;
  birthYear2DigitBB: string;
  estimatedBirthYear: number;
  codeXXX: string;
  sequenceYYYY: string;
  isValidFormat: boolean;
  matchesStudentDob?: boolean;
  studentDobYear?: string;
}

export function parseIndonesianNISN(nisnStr: string, studentDob?: string): DapodikAuditResult['parsedNisn'] | undefined {
  const clean = String(nisnStr || '').trim().replace(/\D/g, '');
  if (clean.length !== 10) return undefined;

  const prefixA = clean.substring(0, 1);
  const birthYear2DigitBB = clean.substring(1, 3);
  const codeXXX = clean.substring(3, 6);
  const sequenceYYYY = clean.substring(6, 10);

  const bbNum = parseInt(birthYear2DigitBB, 10);
  const currentYearShort = new Date().getFullYear() % 100;
  // Siswa sekolah saat ini: tahun lahir 2000-an (misal 00..30) atau 1900-an (misal 90..99)
  const estimatedBirthYear = bbNum <= (currentYearShort + 5) ? 2000 + bbNum : 1900 + bbNum;

  const studentYear = extractBirthYear(studentDob || '');
  let matchesStudentDob: boolean | undefined = undefined;
  if (studentYear) {
    const studentBB = studentYear.slice(-2);
    matchesStudentDob = birthYear2DigitBB === studentBB;
  }

  return {
    raw: clean,
    prefixA,
    birthYear2DigitBB,
    estimatedBirthYear,
    codeXXX,
    sequenceYYYY,
    isValidFormat: true,
    matchesStudentDob,
    studentDobYear: studentYear
  };
}

/**
 * Smart NIK Disdukcapil Parser
 */
export function parseIndonesianNIK(nikStr: string): DapodikAuditResult['parsedNik'] | undefined {
  const clean = String(nikStr || '').trim().replace(/\D/g, '');
  if (clean.length !== 16) return undefined;

  const provCode = clean.substring(0, 2);
  const regencyCode = clean.substring(2, 4);
  const districtCode = clean.substring(4, 6);
  const rawDay = parseInt(clean.substring(6, 8), 10);
  const rawMonth = parseInt(clean.substring(8, 10), 10);
  const rawYearShort = parseInt(clean.substring(10, 12), 10);

  let isFemale = false;
  let birthDay = rawDay;
  if (rawDay > 40) {
    isFemale = true;
    birthDay = rawDay - 40;
  }

  // Taksir tahun lahir (2000-an untuk siswa sekarang)
  const currentYearShort = new Date().getFullYear() % 100;
  const fullYear = rawYearShort <= currentYearShort + 5 ? 2000 + rawYearShort : 1900 + rawYearShort;

  const validDate = birthDay >= 1 && birthDay <= 31 && rawMonth >= 1 && rawMonth <= 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedDate = validDate ? `${fullYear}-${pad(rawMonth)}-${pad(birthDay)}` : '';

  return {
    provinceCode: provCode,
    provinceName: PROVINSI_MAP[provCode] || `Provinsi Kode ${provCode}`,
    regencyCode,
    districtCode,
    parsedGender: isFemale ? 'P' : 'L',
    parsedBirthDate: formattedDate,
    parsedDay: birthDay,
    parsedMonth: rawMonth,
    parsedYear: fullYear,
    isValidFormat: validDate && Boolean(PROVINSI_MAP[provCode])
  };
}

/**
 * Validate a single student record with intelligent cross-referencing
 */
export function isApprovedDuplicate(val: any): boolean {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'ya' || s === 'yes' || s === 'sah' || s === 'benar' || s === 'approved' || s === 'valid';
  }
  return false;
}

export function auditStudentDapodik(
  student: Student,
  allStudents: Student[] = []
): DapodikAuditResult {
  const nisn = String(student.nisn || '').trim();
  const nik = String(student.nik || '').trim().replace(/[-.\s]/g, '');
  const noKk = String(student.noKk || '').trim().replace(/[-.\s]/g, '');
  const name = String(student.name || '').trim();
  const gender = student.gender || 'L';
  const birthDate = String(student.dob || (student as any).birthDate || '').trim();
  const birthPlace = String(student.pob || (student as any).birthPlace || '').trim();
  const namaIbu = String(student.namaIbu || student.NamaIbu || '').trim();
  const namaAyah = String(student.namaAyah || student.fatherName || student.parentName || '').trim();
  const tahunMasuk = String(student.tahunMasuk || (student as any).TahunMasuk || '').trim();
  const rombel = String(student.class || '').trim();

  const otherStudents = allStudents.filter(s => s.id !== student.id);

  // Variable tracking duplicate information
  let hasDuplicateNisn = false;
  let duplicateNisnWith: { studentId: string; name: string; class: string } | undefined;
  let isNisnDuplicateApproved = false;

  let hasDuplicateNik = false;
  let duplicateNikWith: { studentId: string; name: string; class: string } | undefined;
  let isNikDuplicateApproved = false;

  // 1. Audit NISN (Format: Tepat 10 Digit Angka)
  const parsedNisn = parseIndonesianNISN(nisn, birthDate);
  let nisnVal: DapodikFieldValidation = {
    field: 'nisn',
    label: 'NISN (10 Digit Angka)',
    value: nisn || '(Kosong)',
    status: 'valid',
    message: 'NISN valid 10 digit numerik'
  };

  if (!nisn) {
    nisnVal.status = 'invalid';
    nisnVal.message = 'NISN belum diisi (Wajib untuk Verval PD / Dapodik)';
    nisnVal.suggestion = 'Masukkan 10 digit NISN resmi siswa.';
  } else if (!/^\d{10}$/.test(nisn)) {
    nisnVal.status = 'invalid';
    nisnVal.message = `Panjang NISN tidak sesuai (${nisn.length} digit, wajib tepat 10 karakter angka)`;
    nisnVal.suggestion = 'Pastikan NISN terdiri dari tepat 10 digit angka tanpa spasi atau huruf.';
  } else if (/^0{10}$|^1{10}$|^2{10}$|^3{10}$|^4{10}$|^5{10}$|^6{10}$|^7{10}$|^8{10}$|^9{10}$|^1234567890$/.test(nisn)) {
    nisnVal.status = 'invalid';
    nisnVal.message = 'NISN terdeteksi angka dummy / berulang';
    nisnVal.suggestion = 'Ganti dengan nomor NISN resmi siswa.';
  } else {
    // Check duplicate NISN
    const matchingNisns = otherStudents.filter(s => String(s.nisn || '').trim() === nisn && nisn !== '');
    if (matchingNisns.length > 0) {
      const duplicateNisn = matchingNisns[0];
      hasDuplicateNisn = true;
      duplicateNisnWith = { studentId: duplicateNisn.id, name: duplicateNisn.name, class: duplicateNisn.class };
      // Check if this student or ANY matching counterpart is approved
      isNisnDuplicateApproved = isApprovedDuplicate(student.approvedDuplicateNisn) || matchingNisns.some(s => isApprovedDuplicate(s.approvedDuplicateNisn));

      if (isNisnDuplicateApproved) {
        nisnVal.status = 'valid';
        nisnVal.message = `Duplikasi NISN dengan ${duplicateNisn.name} (${duplicateNisn.class}) - Telah Disahkan / Dianggap Benar`;
        nisnVal.suggestion = undefined;
      } else {
        nisnVal.status = 'invalid';
        nisnVal.message = `Duplikasi NISN ganda dengan siswa: ${duplicateNisn.name} (${duplicateNisn.class})`;
        nisnVal.suggestion = 'Konfirmasi apakah data ini dianggap benar (otomatis valid) atau lakukan edit data.';
      }
    } else {
      nisnVal.status = 'valid';
      nisnVal.message = 'NISN valid (10 digit numerik)';
    }
  }

  // 2. Audit NIK Siswa
  const parsedNik = parseIndonesianNIK(nik);
  let nikVal: DapodikFieldValidation = {
    field: 'nik',
    label: 'NIK Siswa (16 Digit Dukcapil)',
    value: nik || '(Kosong)',
    status: 'valid',
    message: 'NIK 16 digit valid sesuai Dukcapil'
  };

  if (!nik) {
    nikVal.status = 'invalid';
    nikVal.message = 'NIK belum diisi (Wajib untuk validasi Pusdatin & Dukcapil)';
    nikVal.suggestion = 'Isi NIK 16 digit sesuai Kartu Keluarga (KK) atau Akta Kelahiran.';
  } else if (!/^\d{16}$/.test(nik)) {
    nikVal.status = 'invalid';
    nikVal.message = `Panjang NIK tidak valid (${nik.length} digit, wajib tepat 16 digit)`;
    nikVal.suggestion = 'Pastikan NIK terdiri dari 16 digit angka tanpa tanda hubung atau huruf.';
  } else if (DUMMY_NIK_PATTERNS.some(p => p.test(nik))) {
    nikVal.status = 'invalid';
    nikVal.message = 'NIK terdeteksi pola dummy / tidak riil (Pasti ditolak Dukcapil)';
    nikVal.suggestion = 'Ganti dengan NIK asli dari Kartu Keluarga resmi.';
  } else {
    // Check duplicate NIK
    const matchingNiks = otherStudents.filter(s => String(s.nik || '').trim().replace(/[-.\s]/g, '') === nik && nik !== '');
    if (matchingNiks.length > 0) {
      const duplicateNik = matchingNiks[0];
      hasDuplicateNik = true;
      duplicateNikWith = { studentId: duplicateNik.id, name: duplicateNik.name, class: duplicateNik.class };
      // Check if this student or ANY matching counterpart is approved
      isNikDuplicateApproved = isApprovedDuplicate(student.approvedDuplicateNik) || matchingNiks.some(s => isApprovedDuplicate(s.approvedDuplicateNik));

      if (isNikDuplicateApproved) {
        nikVal.status = 'valid';
        nikVal.message = `Duplikasi NIK dengan ${duplicateNik.name} (${duplicateNik.class}) - Telah Disahkan / Dianggap Benar`;
        nikVal.suggestion = undefined;
      } else {
        nikVal.status = 'invalid';
        nikVal.message = `Duplikasi NIK ganda dengan siswa: ${duplicateNik.name} (${duplicateNik.class})`;
        nikVal.suggestion = 'Konfirmasi apakah data ini dianggap benar (otomatis valid) atau lakukan edit data.';
      }
    } else if (parsedNik) {
      // Smart validation with gender
      const stdGender = gender === 'P' || String(gender).toLowerCase().startsWith('p') ? 'P' : 'L';
      if (parsedNik.parsedGender !== stdGender) {
        nikVal.status = 'warning';
        nikVal.message = `Tanggal pada NIK (${parsedNik.parsedDay}) mengindikasikan jenis kelamin ${parsedNik.parsedGender === 'P' ? 'Perempuan' : 'Laki-laki'}, berbeda dari profil (${stdGender})`;
        nikVal.suggestion = 'Periksa kesesuaian jenis kelamin di profil siswa atau digit NIK.';
      }

      // Smart validation with birth date
      if (birthDate && parsedNik.parsedBirthDate) {
        const cleanBirth = birthDate.substring(0, 10);
        if (cleanBirth !== parsedNik.parsedBirthDate) {
          nikVal.status = 'warning';
          nikVal.message = `Tanggal lahir di profil (${cleanBirth}) berbeda dengan NIK (${parsedNik.parsedBirthDate})`;
          nikVal.suggestion = 'Samakan tanggal lahir profil dengan data resmi Dukcapil pada NIK.';
        }
      }
    }
  }

  // 3. Audit No KK
  let noKkVal: DapodikFieldValidation = {
    field: 'noKk',
    label: 'Nomor Kartu Keluarga (KK)',
    value: noKk || '(Kosong)',
    status: 'valid',
    message: 'No KK 16 digit valid'
  };

  if (!noKk) {
    noKkVal.status = 'warning';
    noKkVal.message = 'No KK belum diisi (Diperlukan untuk sinkronisasi BOS & PIP)';
    noKkVal.suggestion = 'Lengkapi No. Kartu Keluarga dari lembar KK orang tua.';
  } else if (!/^\d{16}$/.test(noKk)) {
    noKkVal.status = 'invalid';
    noKkVal.message = `Panjang No KK tidak valid (${noKk.length} digit, wajib 16 digit)`;
    noKkVal.suggestion = 'Periksa kembali 16 digit nomor KK di bagian atas Kartu Keluarga.';
  } else if (DUMMY_NIK_PATTERNS.some(p => p.test(noKk))) {
    noKkVal.status = 'invalid';
    noKkVal.message = 'No KK terdeteksi pola dummy / tidak valid';
    noKkVal.suggestion = 'Entri nomor Kartu Keluarga yang sebenarnya.';
  }

  // 4. Audit Nama Lengkap Siswa
  let namaVal: DapodikFieldValidation = {
    field: 'nama',
    label: 'Nama Lengkap Siswa',
    value: name || '(Kosong)',
    status: 'valid',
    message: 'Nama siswa valid'
  };

  if (!name || name.length < 2) {
    namaVal.status = 'invalid';
    namaVal.message = 'Nama siswa terlalu pendek atau kosong';
    namaVal.suggestion = 'Tuliskan nama lengkap sesuai Akta Kelahiran.';
  } else if (/[0-9!@#$%^&*()_+=\[\]{};:"\\|<>/?]/.test(name)) {
    namaVal.status = 'warning';
    namaVal.message = 'Nama mengandung angka atau simbol khusus tidak lazim';
    namaVal.suggestion = 'Hapus karakter angka/simbol khusus dari nama siswa.';
  }

  // 5. Audit Nama Ibu Kandung (KRUSIAL DI DAPODIK)
  let namaIbuVal: DapodikFieldValidation = {
    field: 'namaIbu',
    label: 'Nama Ibu Kandung',
    value: namaIbu || '(Kosong)',
    status: 'valid',
    message: 'Nama Ibu Kandung valid sesuai standar Verval PD'
  };

  if (!namaIbu) {
    namaIbuVal.status = 'invalid';
    namaIbuVal.message = 'Nama Ibu Kandung kosong (Syarat mutlak validasi Pusdatin)';
    namaIbuVal.suggestion = 'Isi nama ibu kandung asli sesuai Akta Kelahiran / KK.';
  } else if (INVALID_MOTHER_PATTERNS.some(p => p.test(namaIbu))) {
    namaIbuVal.status = 'invalid';
    namaIbuVal.message = `Nama Ibu Kandung terdeteksi teks anomali ("${namaIbu}")`;
    namaIbuVal.suggestion = 'Masukkan nama orang yang sebenarnya, bukan status seperti "Almarhumah" atau "Ibu".';
  } else if (namaIbu.length < 3) {
    namaIbuVal.status = 'warning';
    namaIbuVal.message = 'Nama Ibu Kandung sangat singkat (< 3 karakter)';
    namaIbuVal.suggestion = 'Periksa kembali ejaan nama ibu kandung pada KK.';
  }

  // 6. Audit Nama Ayah Kandung
  let namaAyahVal: DapodikFieldValidation = {
    field: 'namaAyah',
    label: 'Nama Ayah Kandung',
    value: namaAyah || '(Kosong)',
    status: 'valid',
    message: 'Nama Ayah terdata'
  };

  if (!namaAyah) {
    namaAyahVal.status = 'warning';
    namaAyahVal.message = 'Nama Ayah Kandung belum diisi';
    namaAyahVal.suggestion = 'Lengkapi nama ayah kandung jika ada di KK / Akta.';
  } else if (INVALID_MOTHER_PATTERNS.some(p => p.test(namaAyah))) {
    namaAyahVal.status = 'warning';
    namaAyahVal.message = `Nama Ayah mengandung teks anomali ("${namaAyah}")`;
    namaAyahVal.suggestion = 'Gunakan nama lengkap ayah kandung yang sebenarnya.';
  }

  // 7. Audit Tanggal Lahir & Usia Sekolah
  let tglLahirVal: DapodikFieldValidation = {
    field: 'tanggalLahir',
    label: 'Tanggal Lahir & Usia',
    value: birthDate || '(Kosong)',
    status: 'valid',
    message: 'Tanggal lahir valid'
  };

  let ageYears: number | undefined = undefined;
  let isDewasa: boolean = false;

  if (!birthDate) {
    tglLahirVal.status = 'invalid';
    tglLahirVal.message = 'Tanggal lahir belum diisi';
    tglLahirVal.suggestion = 'Masukkan tanggal lahir dengan format YYYY-MM-DD.';
  } else {
    const dobDate = new Date(birthDate);
    if (isNaN(dobDate.getTime())) {
      tglLahirVal.status = 'invalid';
      tglLahirVal.message = 'Format tanggal lahir tidak valid';
      tglLahirVal.suggestion = 'Gunakan format standar YYYY-MM-DD.';
    } else {
      const now = new Date();
      ageYears = (now.getTime() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      isDewasa = ageYears >= 21;

      if (ageYears < 5) {
        tglLahirVal.status = 'warning';
        tglLahirVal.message = `Usia siswa terhitung sangat muda (${ageYears.toFixed(1)} tahun)`;
        tglLahirVal.suggestion = 'Pastikan tahun lahir benar (tidak salah ketik tahun berjalan).';
      } else if (ageYears >= 21) {
        // Standar Dapodik 2027: Usia siswa dewasa (21 tahun ke atas) berstatus VALID (Program Kesetaraan / Pendidikan Berkelanjutan)
        tglLahirVal.status = 'valid';
        tglLahirVal.message = `Usia siswa dewasa (${ageYears.toFixed(1)} tahun - Valid/Kesetaraan)`;
      } else {
        tglLahirVal.status = 'valid';
        tglLahirVal.message = `Tanggal lahir valid (Usia ${ageYears.toFixed(1)} tahun)`;
      }
    }
  }

  // 8. Audit Tempat Lahir
  let tempatLahirVal: DapodikFieldValidation = {
    field: 'tempatLahir',
    label: 'Tempat Lahir',
    value: birthPlace || '(Kosong)',
    status: 'valid',
    message: 'Tempat lahir terdata'
  };

  if (!birthPlace) {
    tempatLahirVal.status = 'warning';
    tempatLahirVal.message = 'Tempat lahir belum diisi';
    tempatLahirVal.suggestion = 'Tuliskan nama Kota/Kabupaten kelahiran sesuai Akta Lahir.';
  } else if (/^\d+$/.test(birthPlace)) {
    tempatLahirVal.status = 'invalid';
    tempatLahirVal.message = 'Tempat lahir berisi angka';
    tempatLahirVal.suggestion = 'Ganti dengan nama kota/kabupaten yang benar.';
  }

  // 9. Audit Tahun Masuk
  let tahunMasukVal: DapodikFieldValidation = {
    field: 'tahunMasuk',
    label: 'Tahun Masuk',
    value: tahunMasuk || '(Kosong)',
    status: 'valid',
    message: 'Tahun masuk terdata'
  };

  if (!tahunMasuk) {
    tahunMasukVal.status = 'warning';
    tahunMasukVal.message = 'Tahun masuk belum terisi';
    tahunMasukVal.suggestion = 'Lengkapi tahun awal siswa terdaftar di sekolah.';
  } else if (!/^(19|20)\d{2}/.test(tahunMasuk)) {
    tahunMasukVal.status = 'warning';
    tahunMasukVal.message = 'Format tahun masuk tidak lazim';
    tahunMasukVal.suggestion = 'Gunakan format 4 digit tahun (contoh: 2026).';
  }

  // 10. Audit Rombel
  let rombelVal: DapodikFieldValidation = {
    field: 'rombel',
    label: 'Rombongan Belajar (Kelas)',
    value: rombel || '(Kosong)',
    status: 'valid',
    message: 'Rombel aktif terdaftar'
  };

  if (!rombel) {
    rombelVal.status = 'invalid';
    rombelVal.message = 'Siswa belum dimasukkan ke dalam Rombel/Kelas';
    rombelVal.suggestion = 'Plotting siswa ke kelas aktif untuk sinkronisasi Dapodik.';
  }

  // Calculate scores & status
  const allFieldVals = [
    nisnVal,
    nikVal,
    noKkVal,
    namaVal,
    namaIbuVal,
    namaAyahVal,
    tglLahirVal,
    tempatLahirVal,
    tahunMasukVal,
    rombelVal
  ];

  let invalidCount = 0;
  let warningCount = 0;
  let validCount = 0;

  allFieldVals.forEach(f => {
    if (f.status === 'invalid') invalidCount++;
    else if (f.status === 'warning') warningCount++;
    else validCount++;
  });

  // Calculate Weighted Compliance Score (0-100)
  // NISN (20%), NIK (25%), Ibu Kandung (20%), KK (10%), Nama (10%), Tgl Lahir (5%), Rombel (5%), Lainnya (5%)
  let score = 100;
  if (nisnVal.status === 'invalid') score -= 20;

  if (nikVal.status === 'invalid') score -= 25;
  else if (nikVal.status === 'warning') score -= 8;

  if (namaIbuVal.status === 'invalid') score -= 20;
  else if (namaIbuVal.status === 'warning') score -= 5;

  if (noKkVal.status === 'invalid') score -= 10;
  else if (noKkVal.status === 'warning') score -= 3;

  if (namaVal.status === 'invalid') score -= 10;
  else if (namaVal.status === 'warning') score -= 3;

  if (tglLahirVal.status === 'invalid') score -= 5;
  if (rombelVal.status === 'invalid') score -= 5;
  if (tempatLahirVal.status === 'invalid') score -= 3;
  if (tahunMasukVal.status === 'warning') score -= 2;

  score = Math.max(0, Math.min(100, score));

  // Determine Overall Status
  let overallStatus: DapodikAuditResult['overallStatus'] = 'SIAP_SINKRON';
  let summaryReason = 'Semua atribut wajib Verval PD & Dapodik 100% valid dan siap sinkronisasi.';

  const isCoreMissing = !nisn && !nik && !namaIbu;
  if (isCoreMissing) {
    overallStatus = 'BELUM_TERDATA';
    summaryReason = 'Identitas pokok (NISN, NIK, Ibu Kandung) belum terdata di sistem.';
  } else if (invalidCount > 0) {
    overallStatus = 'RESIDU_DAPODIK';
    summaryReason = `Ditemukan ${invalidCount} atribut invalid (residu) yang wajib diperbaiki sebelum sinkronisasi.`;
  } else if (warningCount > 0 || score < 95) {
    overallStatus = 'PERINGATAN';
    summaryReason = `Data cukup, namun ada ${warningCount} peringatan kelengkapan untuk kualitas optimal.`;
  }

  // Compile smart suggestions
  const suggestions: string[] = [];
  allFieldVals.forEach(f => {
    if (f.suggestion && (f.status === 'invalid' || f.status === 'warning')) {
      suggestions.push(`${f.label}: ${f.suggestion}`);
    }
  });

  return {
    studentId: student.id,
    nisn,
    nik,
    noKk,
    name,
    gender,
    class: rombel,
    birthPlace,
    birthDate,
    namaIbu,
    namaAyah,
    tahunMasuk,
    ageYears,
    isDewasa,
    hasDuplicateNisn,
    duplicateNisnWith,
    isNisnDuplicateApproved,
    hasDuplicateNik,
    duplicateNikWith,
    isNikDuplicateApproved,
    parsedNisn,
    parsedNik,
    validations: {
      nisn: nisnVal,
      nik: nikVal,
      noKk: noKkVal,
      nama: namaVal,
      namaIbu: namaIbuVal,
      namaAyah: namaAyahVal,
      tanggalLahir: tglLahirVal,
      tempatLahir: tempatLahirVal,
      tahunMasuk: tahunMasukVal,
      rombel: rombelVal
    },
    complianceScore: score,
    overallStatus,
    issuesCount: {
      invalid: invalidCount,
      warning: warningCount,
      valid: validCount
    },
    summaryReason,
    suggestions
  };
}

/**
 * Audit all students and calculate aggregate health statistics
 */
export function auditAllStudentsDapodik(students: Student[]) {
  const auditResults = students.map(s => auditStudentDapodik(s, students));

  const stats = {
    total: auditResults.length,
    siapSinkron: auditResults.filter(r => r.overallStatus === 'SIAP_SINKRON').length,
    peringatan: auditResults.filter(r => r.overallStatus === 'PERINGATAN').length,
    residu: auditResults.filter(r => r.overallStatus === 'RESIDU_DAPODIK').length,
    dewasa: auditResults.filter(r => r.isDewasa || (r.ageYears !== undefined && r.ageYears >= 21)).length,
    belumTerdata: auditResults.filter(r => r.overallStatus === 'BELUM_TERDATA').length,
    avgScore: auditResults.length > 0 
      ? Math.round(auditResults.reduce((acc, r) => acc + r.complianceScore, 0) / auditResults.length) 
      : 0,
    invalidNisn: auditResults.filter(r => r.validations.nisn.status === 'invalid').length,
    invalidNik: auditResults.filter(r => r.validations.nik.status === 'invalid').length,
    invalidIbu: auditResults.filter(r => r.validations.namaIbu.status === 'invalid').length,
    invalidKk: auditResults.filter(r => r.validations.noKk.status === 'invalid').length,
    duplicateCount: auditResults.filter(r => (r.hasDuplicateNisn && !r.isNisnDuplicateApproved) || (r.hasDuplicateNik && !r.isNikDuplicateApproved)).length,
    totalDuplicates: auditResults.filter(r => r.hasDuplicateNisn || r.hasDuplicateNik).length,
    approvedDuplicates: auditResults.filter(r => r.isNisnDuplicateApproved || r.isNikDuplicateApproved).length
  };

  return {
    results: auditResults,
    stats,
    resultMap: new Map(auditResults.map(r => [r.studentId, r]))
  };
}

/**
 * Otomatis menghasilkan 14 kolom standar skema DAPODIK_VALIDASI dari seluruh data siswa:
 * ValidasiID | SiswaID | NISN | NIK | NoKK | NamaSiswa | NamaIbuKandung | TanggalLahir | StatusDapodik | CatatanInvalid | TglValidasi | UpdatedAt | TahunAjaran | Buktiterdaftar
 */
export function generateDapodikValidasiRows(students: Student[], defaultTahunAjaran: string = '2026/2027'): DapodikValidationRecord[] {
  const auditData = auditAllStudentsDapodik(students);
  const nowStr = new Date().toISOString();
  const dateOnly = nowStr.slice(0, 10);

  return auditData.results.map((r, idx) => {
    const s = students.find(item => item.id === r.studentId) || ({} as Partial<Student>);
    
    // Status Dapodik mapping
    let statusDapodik = 'Belum Terdata';
    if (r.overallStatus === 'SIAP_SINKRON') statusDapodik = 'Valid';
    else if (r.overallStatus === 'PERINGATAN') statusDapodik = 'Peringatan';
    else if (r.overallStatus === 'RESIDU_DAPODIK') statusDapodik = 'Residu';

    // Bukti terdaftar mapping
    let buktiterdaftar = 'Belum Terdaftar';
    if (r.overallStatus === 'SIAP_SINKRON') {
      buktiterdaftar = 'Terdaftar Valid di Dapodik Pusat & Verval PD';
    } else if (r.overallStatus === 'PERINGATAN') {
      buktiterdaftar = 'Terdata Lokal (Menunggu Kelengkapan Dokumen)';
    } else if (r.overallStatus === 'RESIDU_DAPODIK') {
      buktiterdaftar = 'Residu Dukcapil / Perlu Koreksi Akta & KK';
    } else {
      buktiterdaftar = 'Belum Sinkron Dapodik';
    }

    // Catatan Invalid detail
    let catatanInvalid = '-';
    if (r.overallStatus !== 'SIAP_SINKRON') {
      const issues: string[] = [];
      if (r.validations.nisn.status !== 'valid') issues.push(`NISN: ${r.validations.nisn.message}`);
      if (r.validations.nik.status !== 'valid') issues.push(`NIK: ${r.validations.nik.message}`);
      if (r.validations.noKk.status !== 'valid') issues.push(`KK: ${r.validations.noKk.message}`);
      if (r.validations.namaIbu.status !== 'valid') issues.push(`Ibu: ${r.validations.namaIbu.message}`);
      if (r.validations.tanggalLahir.status !== 'valid') issues.push(`Tgl Lahir: ${r.validations.tanggalLahir.message}`);
      if (r.suggestions.length > 0) issues.push(`Saran: ${r.suggestions.join(', ')}`);
      catatanInvalid = issues.join(' | ') || r.summaryReason || 'Perlu Perbaikan Data';
    }

    // Tahun Ajaran
    const thnAjaran = r.tahunMasuk || (s as any)?.tahunMasuk || (s as any)?.TahunMasuk || defaultTahunAjaran;

    return {
      id: `VAL-${s.id || idx + 1}`,
      ValidasiID: `VAL-${s.id || s.nis || idx + 1}`,
      SiswaID: s.id || s.nis || `SISWA-${idx + 1}`,
      NISN: r.nisn || '-',
      NIK: r.nik || '-',
      NoKK: r.noKk || '-',
      NamaSiswa: r.name || 'Siswa',
      NamaIbuKandung: r.namaIbu || '-',
      TanggalLahir: r.birthDate || '-',
      StatusDapodik: statusDapodik,
      CatatanInvalid: catatanInvalid,
      TglValidasi: dateOnly,
      UpdatedAt: (s as any)?.updatedAt || nowStr,
      TahunAjaran: thnAjaran,
      Buktiterdaftar: buktiterdaftar
    };
  });
}
