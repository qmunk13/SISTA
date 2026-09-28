import * as XLSX from 'xlsx';
import { Student, Teacher } from '../types';
import { standardizeDate, normalizeClassName, matchStatusActive } from './utils';
import { MASTER_TABLES_60 } from '../data/masterDatabase60';

export function formatStudentAddress(s: Partial<Student> | any): string {
  if (!s) return '-';
  const parts: string[] = [];
  const mainAddress = String(s.address || s.alamat || s.alamatDomisili || '').trim();
  if (mainAddress && mainAddress !== '-' && mainAddress !== 'null' && mainAddress !== 'undefined') {
    parts.push(mainAddress);
  }

  const rt = String(s.rt || s.RT || '').replace(/^RT[\s.:]*/i, '').trim();
  const rw = String(s.rw || s.RW || '').replace(/^RW[\s.:]*/i, '').trim();
  if (rt && rw && rt !== '-' && rw !== '-') {
    parts.push(`RT ${rt}/RW ${rw}`);
  } else if (rt && rt !== '-') {
    parts.push(`RT ${rt}`);
  } else if (rw && rw !== '-') {
    parts.push(`RW ${rw}`);
  }

  const kel = String(s.kelurahan || s.desa || s.Kelurahan || '').trim();
  if (kel && kel !== '-' && kel !== 'null') {
    parts.push(kel.toLowerCase().startsWith('kel') || kel.toLowerCase().startsWith('desa') ? kel : `Kel. ${kel}`);
  }

  const kec = String(s.kecamatan || s.Kecamatan || '').trim();
  if (kec && kec !== '-' && kec !== 'null') {
    parts.push(kec.toLowerCase().startsWith('kec') ? kec : `Kec. ${kec}`);
  }

  const kota = String(s.kota || s.kabupaten || s.Kota || s.Kabupaten || '').trim();
  if (kota && kota !== '-' && kota !== 'null') {
    parts.push(kota);
  }

  const kodePos = String(s.kodePos || s.KodePos || '').trim();
  if (kodePos && kodePos !== '-' && kodePos !== 'null') {
    parts.push(kodePos);
  }

  return parts.length > 0 ? parts.join(', ') : (mainAddress || '-');
}

export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 10);
  let semicolons = 0;
  let commas = 0;
  let tabs = 0;

  for (const line of lines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes) {
        if (char === ';') semicolons++;
        else if (char === ',') commas++;
        else if (char === '\t') tabs++;
      }
    }
  }

  if (semicolons > commas && semicolons > tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

export function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

// 70 Headers resmi Master SISWA
export const MASTER_SISWA_COLUMNS = [
  "nopdkt", "TahunMasuk", "NISN", "NamaLengkap", "JenisKelamin", "Tempat Lahir", "TanggalLahir", 
  "NIK", "Anak ke", "Saudara", "Agama", "Golongan Darah", "TinggiBadan(cm)", "BeratBadan(kg)", 
  "Prestasi", "Hobi", "Catatan Penting", "Alamat", "RT", "RW", "Kelurahan", "Kecamatan", "Kota", 
  "Provinsi", "KodePos", "JenisTinggal", "AlatTransportasi", "NomorHP", "E-Mail", "AsalSekolah", 
  "SKHUN", "PenerimaKPS", "PasFoto", "NomorKartuKeluarga", "NamaAyah", "NIKAyah", "TempatLahirAyah", 
  "TanggalLahirAyah", "PendidikanAyah", "PekerjaanAyah", "PenghasilanAyah", "TlpAyah", "StatusAyah", "NamaIbu", 
  "NIKIbu", "TempatLahirIbu", "TanggalLahirIbu", "PendidikanIbu", "PekerjaanIbu", "PenghasilanIbu", 
  "TlpIbu", "StatusIbu", "StatusYatim", "NamaWali", "TempatLahirWali", "TglLahirWali", "PendidikanWali", "PekerjaanWali", 
  "PenghasilanWali", "Hubungan", "Tlp.Wali", "AktaKelahiran", "KartuKeluarga", "KIA", "KTPAyah", 
  "KTPIbu", "Ijazah", "KTPWali", "Rapor", "S.Pindah", "SuKet", "S.Domisili", "FormPendaftaran", "SPernyataan", "SKesanggupan", "BerkasLainnya", "Status", "KelasSaatini"
];

export const MASTER_GURU_COLUMNS = [
  "GuruID", "NIK", "NIP", "NUPTK", "Nama", "Gelar", "JenisKelamin", "TempatLahir", "TanggalLahir", 
  "Agama", "Alamat", "NoHP", "Email", "Jabatan", "StatusKepegawaian", "Pendidikan", "Jurusan", "TMT", "Status", "Foto", "CreatedAt", "UpdatedAt"
];

// Helper helper value finder
function findVal(row: Record<string, any>, possibleKeys: string[]): any {
  for (const k of possibleKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return row[k];
    }
  }
  // Case-insensitive fallback
  const rowKeys = Object.keys(row);
  for (const target of possibleKeys) {
    const targetNorm = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === targetNorm);
    if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
      return row[found];
    }
  }
  return undefined;
}

// -------------------------------------------------------------
// DOWNLOAD TEMPLATES
// -------------------------------------------------------------

export const downloadStudentMasterTemplate = (filename: string = 'Template_Master_SISWA_70_Kolom.xlsx') => {
  const ws = XLSX.utils.json_to_sheet([], { header: MASTER_SISWA_COLUMNS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SISWA");
  XLSX.writeFile(wb, filename);
};

export const downloadStudentExcelTemplate = (filename: string = 'Template_Import_Siswa_Ringkas.xlsx') => {
  const ws = XLSX.utils.json_to_sheet([], {
    header: ["NIS", "NISN", "NIK", "Nama Lengkap", "Kelas", "L/P", "Tempat Lahir", "Tgl Lahir", "Alamat", "Nama Ayah / Ortu", "Nama Ibu", "No HP", "Status", "No Ijazah"]
  });

  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
    { wch: 10 },
    { wch: 8 },
    { wch: 18 },
    { wch: 14 },
    { wch: 30 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
  XLSX.writeFile(wb, filename);
};

export const downloadTeacherExcelTemplate = (filename: string = 'Template_Master_GURU_GTK.xlsx') => {
  const ws = XLSX.utils.json_to_sheet([], {
    header: MASTER_GURU_COLUMNS
  });

  ws['!cols'] = [
    { wch: 12 }, // GuruID
    { wch: 20 }, // NIK
    { wch: 20 }, // NIP
    { wch: 20 }, // NUPTK
    { wch: 28 }, // Nama
    { wch: 12 }, // Gelar
    { wch: 12 }, // JenisKelamin
    { wch: 18 }, // TempatLahir
    { wch: 14 }, // TanggalLahir
    { wch: 14 }, // Agama
    { wch: 30 }, // Alamat
    { wch: 16 }, // NoHP
    { wch: 25 }, // Email
    { wch: 22 }, // Jabatan
    { wch: 18 }, // StatusKepegawaian
    { wch: 14 }, // Pendidikan
    { wch: 20 }, // Jurusan
    { wch: 14 }, // TMT
    { wch: 12 }, // Status
    { wch: 28 }, // Foto
    { wch: 20 }, // CreatedAt
    { wch: 20 }  // UpdatedAt
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "GURU");
  XLSX.writeFile(wb, filename);
};

export const downloadAssessmentExcelTemplate = (filename: string = 'Template_Nilai_Rapor_Asesmen.xlsx') => {
  const exampleData = [
    {
      "NISN": "0123456789",
      "Nama Siswa": "Ahmad Fauzi",
      "Kelas": "1A",
      "Mata Pelajaran": "Pendidikan Pancasila",
      "TP1 (Formatif 1)": 85,
      "TP2 (Formatif 2)": 90,
      "TP3 (Formatif 3)": 88,
      "Sumatif Tengah Semester (STS)": 86,
      "Sumatif Akhir Semester (SAS)": 89,
      "Nilai Akhir": 88,
      "Capaian Kompetensi / Deskripsi": "Menunjukkan penguasaan yang sangat baik dalam memahami simbol-simbol sila Pancasila."
    },
    {
      "NISN": "0987654321",
      "Nama Siswa": "Siti Aminah",
      "Kelas": "1A",
      "Mata Pelajaran": "Pendidikan Pancasila",
      "TP1 (Formatif 1)": 92,
      "TP2 (Formatif 2)": 95,
      "TP3 (Formatif 3)": 90,
      "Sumatif Tengah Semester (STS)": 94,
      "Sumatif Akhir Semester (SAS)": 93,
      "Nilai Akhir": 93,
      "Capaian Kompetensi / Deskripsi": "Sangat terampil dalam menerapkan nilai-nilai gotong royong dan musyawarah di lingkungan kelas."
    }
  ];

  const ws = XLSX.utils.json_to_sheet(exampleData);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 8 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 12 },
    { wch: 45 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NILAI_RAPOR");
  XLSX.writeFile(wb, filename);
};

export const downloadFinanceExcelTemplate = (filename: string = 'Template_Keuangan_Tagihan_Biaya.xlsx') => {
  const exampleData = [
    {
      "NIS": "252601001",
      "Nama Siswa": "Ahmad Fauzi",
      "Kelas": "1A",
      "Jenis Tagihan": "Iuran Bulanan (Juli)",
      "Nominal (Rp)": 150000,
      "Tanggal Tagihan": "2025-07-01",
      "Status Bayar": "Lunas",
      "Tanggal Pembayaran": "2025-07-05",
      "Metode Pembayaran": "Tunai",
      "Keterangan": "Pembayaran lunas kasir sekolah"
    },
    {
      "NIS": "252601002",
      "Nama Siswa": "Siti Aminah",
      "Kelas": "1A",
      "Jenis Tagihan": "Iuran Bulanan (Juli)",
      "Nominal (Rp)": 150000,
      "Tanggal Tagihan": "2025-07-01",
      "Status Bayar": "Belum Bayar",
      "Tanggal Pembayaran": "-",
      "Metode Pembayaran": "-",
      "Keterangan": "Menunggu konfirmasi ortu"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(exampleData);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 8 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TAGIHAN_BIAYA");
  XLSX.writeFile(wb, filename);
};

export const downloadAttendanceExcelTemplate = (filename: string = 'Template_Presensi_Kehadiran.xlsx') => {
  const exampleData = [
    {
      "NISN": "0123456789",
      "Nama Siswa": "Ahmad Fauzi",
      "Kelas": "1A",
      "Bulan": "Juli 2025",
      "Hadir (H)": 20,
      "Sakit (S)": 1,
      "Izin (I)": 0,
      "Alpa (A)": 0,
      "Persentase Kehadiran": "95.2%",
      "Keterangan": "Sakit demam 1 hari"
    },
    {
      "NISN": "0987654321",
      "Nama Siswa": "Siti Aminah",
      "Kelas": "1A",
      "Bulan": "Juli 2025",
      "Hadir (H)": 21,
      "Sakit (S)": 0,
      "Izin (I)": 0,
      "Alpa (A)": 0,
      "Persentase Kehadiran": "100%",
      "Keterangan": "Disiplin sangat baik"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(exampleData);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
    { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PRESENSI");
  XLSX.writeFile(wb, filename);
};

// -------------------------------------------------------------
// EXPORT DATA
// -------------------------------------------------------------

export const exportToExcel = (data: (Student | Record<string, any>)[], filename: string = 'data-siswa.xlsx', sheetName: string = 'SISWA') => {
  if (data.length === 0) return;

  const firstItem = data[0];
  let formattedData: any[] = [];

  if ('id' in firstItem && 'class' in firstItem) {
    // Format lengkap 70 Kolom Master SISWA
    formattedData = (data as Student[]).map(s => ({
      "nopdkt": s.nis || s.id,
      "TahunMasuk": s.tahunMasuk || s.TahunMasuk || (s as any)['Tahun Masuk'] || '',
      "NISN": s.nisn || '',
      "NamaLengkap": s.name,
      "JenisKelamin": s.gender,
      "Tempat Lahir": s.pob || '',
      "TanggalLahir": s.dob || '',
      "NIK": s.nik || '',
      "Anak ke": s.anakKe || '',
      "Saudara": s.saudara || '',
      "Agama": s.agama || 'Islam',
      "Golongan Darah": s.golonganDarah || '',
      "TinggiBadan(cm)": s.tinggiBadan || '',
      "BeratBadan(kg)": s.beratBadan || '',
      "Prestasi": s.prestasi || '',
      "Hobi": s.hobi || '',
      "Catatan Penting": s.catatanPenting || '',
      "Alamat": s.address || '',
      "RT": s.rt ? String(s.rt).replace(/^RT[\s.:]*/i, '').trim() : '',
      "RW": s.rw ? String(s.rw).replace(/^RW[\s.:]*/i, '').trim() : '',
      "Kelurahan": s.kelurahan || '',
      "Kecamatan": s.kecamatan || '',
      "Kota": s.kota || '',
      "Provinsi": s.provinsi || '',
      "KodePos": s.kodePos || '',
      "JenisTinggal": s.jenisTinggal || '',
      "AlatTransportasi": s.alatTransportasi || '',
      "NomorHP": s.noHp || '',
      "E-Mail": s.email || '',
      "AsalSekolah": s.sekolahAsal || '',
      "SKHUN": s.skhun || '',
      "PenerimaKPS": s.penerimaKps || 'Tidak',
      "PasFoto": s.fotoUrl || '',
      "NomorKartuKeluarga": s.noKk || '',
      "NamaAyah": s.namaAyah || s.parentName || '',
      "NIKAyah": s.nikAyah || '',
      "TempatLahirAyah": s.tempatLahirAyah || '',
      "TanggalLahirAyah": s.tanggalLahirAyah || '',
      "PendidikanAyah": s.pendidikanAyah || '',
      "PekerjaanAyah": s.pekerjaanAyah || '',
      "PenghasilanAyah": s.penghasilanAyah || '',
      "TlpAyah": s.tlpAyah || '',
      "StatusAyah": s.statusAyah || 'Masih Hidup',
      "NamaIbu": s.namaIbu || '',
      "NIKIbu": s.nikIbu || '',
      "TempatLahirIbu": s.tempatLahirIbu || '',
      "TanggalLahirIbu": s.tanggalLahirIbu || '',
      "PendidikanIbu": s.pendidikanIbu || '',
      "PekerjaanIbu": s.pekerjaanIbu || '',
      "PenghasilanIbu": s.penghasilanIbu || '',
      "TlpIbu": s.tlpIbu || '',
      "StatusIbu": s.statusIbu || 'Masih Hidup',
      "StatusYatim": s.statusYatim || (s.statusAyah === 'Meninggal' && s.statusIbu === 'Meninggal' ? 'Yatim Piatu' : s.statusAyah === 'Meninggal' ? 'Yatim' : s.statusIbu === 'Meninggal' ? 'Piatu' : 'Lengkap'),
      "NamaWali": s.namaWali || '',
      "TempatLahirWali": s.tempatLahirWali || '',
      "TglLahirWali": s.tglLahirWali || '',
      "PendidikanWali": s.pendidikanWali || '',
      "PekerjaanWali": s.pekerjaanWali || '',
      "PenghasilanWali": s.penghasilanWali || '',
      "Hubungan": s.hubunganWali || '',
      "Tlp.Wali": s.tlpWali || '',
      "AktaKelahiran": s.aktaKelahiranUrl || s.akteUrl || '',
      "KartuKeluarga": s.kartuKeluargaUrl || s.kkUrl || '',
      "KIA": s.kiaUrl || s.ktpAnakUrl || '',
      "KTPAyah": s.ktpAyahUrl || '',
      "KTPIbu": s.ktpIbuUrl || '',
      "Ijazah": s.ijazahUrl || '',
      "KTPWali": s.ktpWaliUrl || '',
      "Rapor": s.raporUrl || s.rapotUrl || '',
      "S.Pindah": s.suratPindahUrl || '',
      "SuKet": s.suKetUrl || s.dokumenLainUrl || '',
      "S.Domisili": s.suratDomisiliUrl || '',
      "FormPendaftaran": s.formPendaftaranUrl || s.formUrl || '',
      "SPernyataan": s.suratPernyataanUrl || s.sPernyataanUrl || s.pernyataanUrl || '',
      "SKesanggupan": s.suratKesanggupanUrl || s.sKesanggupanUrl || s.kesanggupanUrl || '',
      "BerkasLainnya": s.berkasLainnyaUrl || (Array.isArray(s.customDocs) && s.customDocs.length > 0 ? s.customDocs.map((c: any) => `${c.name}: ${c.url}`).join(' | ') : ''),
      "Status": s.status,
      "KelasSaatini": s.class
    }));
  } else {
    formattedData = data;
  }

  const ws = XLSX.utils.json_to_sheet(formattedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

export const exportTeachersToExcel = (teachers: Teacher[], filename: string = 'data-guru-tendik.xlsx') => {
  const ws = XLSX.utils.json_to_sheet(teachers.map((t, idx) => ({
    "GuruID": t.id || `TCH-${idx + 1}`,
    "NIK": t.nik || '-',
    "NIP": t.nip || '-',
    "NUPTK": t.nuptk || '-',
    "Nama": t.name,
    "Gelar": t.gelar || '-',
    "JenisKelamin": t.gender,
    "TempatLahir": t.tempatLahir || '-',
    "TanggalLahir": t.tanggalLahir || '-',
    "Agama": t.agama || 'Islam',
    "Alamat": t.alamat || '-',
    "NoHP": t.phone || '-',
    "Email": t.email || '-',
    "Jabatan": t.class === 'None' ? (t.jabatan || 'Guru Mapel') : t.class,
    "StatusKepegawaian": t.statusKepegawaian || 'Tetap',
    "Pendidikan": t.pendidikan || 'S1',
    "Jurusan": t.jurusan || '-',
    "TMT": t.tmt || '-',
    "Status": t.status,
    "Foto": t.fotoUrl || '-',
    "CreatedAt": t.createdAt || new Date().toISOString(),
    "UpdatedAt": t.updatedAt || new Date().toISOString()
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "GURU");
  XLSX.writeFile(wb, filename);
};

export const exportDocumentChecklistToExcel = (students: Student[], filename: string = 'Ceklis_Kelengkapan_Berkas_Siswa.xlsx') => {
  const rows = students.map((s, idx) => {
    const hasFoto = !!(s.fotoUrl || s.pasFoto);
    const hasAkta = !!(s.aktaKelahiranUrl || s.akteUrl);
    const hasKK = !!(s.kartuKeluargaUrl || s.kkUrl);
    const hasKIA = !!(s.kiaUrl || s.ktpAnakUrl);
    const hasKTPAyah = !!s.ktpAyahUrl;
    const hasKTPIbu = !!s.ktpIbuUrl;
    const hasIjazah = !!s.ijazahUrl;
    const hasKtpWali = !!s.ktpWaliUrl;
    const hasRapor = !!(s.raporUrl || s.rapotUrl);
    const hasPindah = !!s.suratPindahUrl;
    const hasSuKet = !!(s.suKetUrl || s.dokumenLainUrl);
    const hasDomisiliKip = !!(s.suratDomisiliUrl || s.kipUrl || s.penerimaKps === 'Ya');

    const collectedCount = [
      hasFoto, hasAkta, hasKK, hasKIA, hasKTPAyah, hasKTPIbu, 
      hasIjazah, hasKtpWali, hasRapor, hasPindah, hasSuKet, hasDomisiliKip
    ].filter(Boolean).length;
    const totalDocs = 12;
    const percentage = Math.round((collectedCount / totalDocs) * 100);

    return {
      "No": idx + 1,
      "No. PDKT / NIS": s.nis || '-',
      "NISN": s.nisn || '-',
      "Nama Lengkap Siswa": s.name,
      "Kelas": s.class,
      "L/P": s.gender,
      "1. Pas Foto (3x4)": hasFoto ? 'ADA' : 'BELUM',
      "2. Akta Kelahiran": hasAkta ? 'ADA (Lengkap)' : 'BELUM',
      "3. Kartu Keluarga (KK)": hasKK ? 'ADA (Lengkap)' : 'BELUM',
      "4. KIA / KTP Anak": hasKIA ? 'ADA' : 'BELUM',
      "5. KTP Ayah": hasKTPAyah ? 'ADA' : 'BELUM',
      "6. KTP Ibu": hasKTPIbu ? 'ADA' : 'BELUM',
      "7. Ijazah / SKL": hasIjazah ? 'ADA' : 'BELUM',
      "8. KTP Wali": hasKtpWali ? 'ADA' : '-',
      "9. Buku Rapor": hasRapor ? 'ADA' : 'BELUM',
      "10. Surat Pindah": hasPindah ? 'ADA' : '-',
      "11. Surat Keterangan": hasSuKet ? 'ADA' : '-',
      "12. Surat Domisili / KIP": hasDomisiliKip ? 'ADA' : 'BELUM',
      "Total Berkas": `${collectedCount} / ${totalDocs}`,
      "Kelengkapan (%)": `${percentage}%`,
      "Status Berkas": collectedCount >= 6 ? 'LENGKAP' : 'BELUM LENGKAP',
      "Nama Orang Tua": s.parentName || s.namaAyah || s.namaIbu || '-',
      "No HP Ortu": s.noHp || s.tlpAyah || s.tlpIbu || '-'
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 16 }, // NIS
    { wch: 14 }, // NISN
    { wch: 26 }, // Nama
    { wch: 8 },  // Kelas
    { wch: 6 },  // L/P
    { wch: 12 }, // Foto
    { wch: 16 }, // Akta
    { wch: 18 }, // KK
    { wch: 14 }, // KIA
    { wch: 14 }, // KTP Ayah
    { wch: 14 }, // KTP Ibu
    { wch: 14 }, // Ijazah
    { wch: 14 }, // KTP Wali
    { wch: 14 }, // Rapor
    { wch: 14 }, // Surat Pindah
    { wch: 16 }, // SuKet
    { wch: 18 }, // Domisili
    { wch: 14 }, // Total
    { wch: 16 }, // %
    { wch: 18 }, // Status
    { wch: 22 }, // Ortu
    { wch: 16 }  // HP
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ceklis_Berkas_Siswa");
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

export const exportYatimPiatuToExcel = (students: Student[], filename: string = `Data_Siswa_Yatim_Piatu_${new Date().toISOString().slice(0, 10)}.xlsx`) => {
  const activeStudents = (students || []).filter(s => matchStatusActive(s?.status));
  const rows = activeStudents.map((s, idx) => {
    const sAyah = String(s.statusAyah || (s as any)['StatusAyah'] || '').trim();
    const sIbu = String(s.statusIbu || (s as any)['StatusIbu'] || '').trim();
    const sYatim = String(s.statusYatim || (s as any)['StatusYatim'] || '').trim();

    let statusYatimFinal = sYatim || 'Lengkap';
    if (!sYatim) {
      const isADead = sAyah.toLowerCase().includes('meninggal') || sAyah.toLowerCase().includes('almarhum') || sAyah.toLowerCase().includes('wafat');
      const isIDead = sIbu.toLowerCase().includes('meninggal') || sIbu.toLowerCase().includes('almarhumah') || sIbu.toLowerCase().includes('wafat');
      if (isADead && isIDead) statusYatimFinal = 'Yatim Piatu';
      else if (isADead) statusYatimFinal = 'Yatim';
      else if (isIDead) statusYatimFinal = 'Piatu';
      else statusYatimFinal = 'Lengkap';
    }

    const waliName = s.namaWali || s.parentName || s.namaIbu || s.namaAyah || '-';
    const waliPhone = s.tlpWali || s.noHp || s.tlpIbu || s.tlpAyah || '-';

    return {
      "No": idx + 1,
      "No. PDKT / NIS": s.nis || s.id || '-',
      "NISN": s.nisn || '-',
      "Nama Siswa": s.name,
      "Kelas": s.class,
      "L/P": s.gender,
      "Status Kondisi": statusYatimFinal,
      "Nama Ayah": s.namaAyah || (s as any).fatherName || '-',
      "Kondisi Ayah": s.statusAyah || (sAyah.toLowerCase().includes('meninggal') ? 'Meninggal' : 'Masih Hidup'),
      "Nama Ibu": s.namaIbu || (s as any).NamaIbu || '-',
      "Kondisi Ibu": s.statusIbu || (sIbu.toLowerCase().includes('meninggal') ? 'Meninggal' : 'Masih Hidup'),
      "Nama Wali / Pengasuh": waliName,
      "Hubungan Wali": s.hubunganWali || (s.namaWali ? 'Wali' : (statusYatimFinal === 'Yatim' ? 'Ibu Kandung' : statusYatimFinal === 'Piatu' ? 'Ayah Kandung' : 'Orang Tua')),
      "No HP / WA Wali": waliPhone,
      "Alamat Tinggal": formatStudentAddress(s),
      "Penerima KPS / PIP": s.penerimaKps || (s.kipUrl ? 'Ya (KIP)' : 'Tidak'),
      "Keterangan / Bantuan": statusYatimFinal !== 'Lengkap' ? `Prioritas Bantuan Sosial (${statusYatimFinal})` : 'Reguler'
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // NIS
    { wch: 14 }, // NISN
    { wch: 26 }, // Nama Siswa
    { wch: 8 },  // Kelas
    { wch: 6 },  // L/P
    { wch: 16 }, // Status
    { wch: 22 }, // Ayah
    { wch: 15 }, // Status Ayah
    { wch: 22 }, // Ibu
    { wch: 15 }, // Status Ibu
    { wch: 22 }, // Wali
    { wch: 16 }, // Hubungan
    { wch: 16 }, // No HP
    { wch: 32 }, // Alamat
    { wch: 16 }, // KPS/PIP
    { wch: 28 }  // Keterangan
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "YATIM_PIATU");
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

export const exportOrangTuaMasterToExcel = (students: Student[], filename: string = `Data_Orang_Tua_Wali_${new Date().toISOString().slice(0, 10)}.xlsx`) => {
  const rows: any[] = [];
  let no = 1;

  students.forEach((s) => {
    const studentAddress = formatStudentAddress(s);

    // 1. Ayah
    if (s.namaAyah || (s as any).fatherName) {
      rows.push({
        "No": no++,
        "Siswa": s.name,
        "NISN": s.nisn || s.nis || '-',
        "Kelas": s.class,
        "Hubungan": "Ayah Kandung",
        "Nama Orang Tua": s.namaAyah || (s as any).fatherName,
        "Status": s.statusAyah || 'Masih Hidup',
        "NIK": s.nikAyah || '-',
        "Pekerjaan": s.pekerjaanAyah || (s as any).fatherJob || '-',
        "Penghasilan": s.penghasilanAyah || '-',
        "No Telepon / WA": s.tlpAyah || s.noHp || '-',
        "Alamat": studentAddress
      });
    }

    // 2. Ibu
    if (s.namaIbu || (s as any).NamaIbu) {
      rows.push({
        "No": no++,
        "Siswa": s.name,
        "NISN": s.nisn || s.nis || '-',
        "Kelas": s.class,
        "Hubungan": "Ibu Kandung",
        "Nama Orang Tua": s.namaIbu || (s as any).NamaIbu,
        "Status": s.statusIbu || 'Masih Hidup',
        "NIK": s.nikIbu || '-',
        "Pekerjaan": s.pekerjaanIbu || (s as any).motherJob || '-',
        "Penghasilan": s.penghasilanIbu || '-',
        "No Telepon / WA": s.tlpIbu || s.noHp || '-',
        "Alamat": studentAddress
      });
    }

    // 3. Wali (jika ada dan beda dari ayah/ibu)
    if (s.namaWali && s.namaWali !== s.namaAyah && s.namaWali !== s.namaIbu) {
      rows.push({
        "No": no++,
        "Siswa": s.name,
        "NISN": s.nisn || s.nis || '-',
        "Kelas": s.class,
        "Hubungan": s.hubunganWali || "Wali Murid",
        "Nama Orang Tua": s.namaWali,
        "Status": "Masih Hidup",
        "NIK": "-",
        "Pekerjaan": s.pekerjaanWali || '-',
        "Penghasilan": s.penghasilanWali || '-',
        "No Telepon / WA": s.tlpWali || s.noHp || '-',
        "Alamat": studentAddress
      });
    }

    // Jika tidak ada data rinci ayah/ibu/wali, gunakan parentName
    if (!s.namaAyah && !(s as any).fatherName && !s.namaIbu && !(s as any).NamaIbu && !s.namaWali) {
      rows.push({
        "No": no++,
        "Siswa": s.name,
        "NISN": s.nisn || s.nis || '-',
        "Kelas": s.class,
        "Hubungan": "Orang Tua / Wali",
        "Nama Orang Tua": s.parentName || 'Orang Tua Siswa',
        "Status": "Masih Hidup",
        "NIK": "-",
        "Pekerjaan": "-",
        "Penghasilan": "-",
        "No Telepon / WA": s.noHp || '-',
        "Alamat": studentAddress
      });
    }
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 24 }, // Siswa
    { wch: 14 }, // NISN
    { wch: 8 },  // Kelas
    { wch: 16 }, // Hubungan
    { wch: 24 }, // Nama Ortu
    { wch: 14 }, // Status
    { wch: 18 }, // NIK
    { wch: 20 }, // Pekerjaan
    { wch: 18 }, // Penghasilan
    { wch: 18 }, // No HP
    { wch: 35 }  // Alamat
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ORANG_TUA");
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

// -------------------------------------------------------------
// IMPORT & SMART PARSER
// -------------------------------------------------------------

export function parseCSVToStudents(text: string): Partial<Student>[] {
  const delimiter = detectDelimiter(text);
  const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (rawLines.length === 0) return [];

  const parsedRows = rawLines.map(l => parseCSVLine(l, delimiter));
  if (parsedRows.length <= 1) return [];

  const headers = parsedRows[0];
  const results: Partial<Student>[] = [];

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length === 0 || row.every(c => !c)) continue;
    
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx];
    });

    const parsed = mapRowToStudent(rowObj);
    if (parsed.name || parsed.nis || parsed.nisn) {
      results.push(parsed);
    }
  }

  return results;
}

export function parseCSVToTeachers(text: string): Partial<Teacher>[] {
  const delimiter = detectDelimiter(text);
  const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (rawLines.length === 0) return [];

  const parsedRows = rawLines.map(l => parseCSVLine(l, delimiter));
  if (parsedRows.length <= 1) return [];

  const headers = parsedRows[0];
  const results: Partial<Teacher>[] = [];

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length === 0 || row.every(c => !c)) continue;
    
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx];
    });

    const parsed = mapRowToTeacher(rowObj);
    if (parsed.name || parsed.nip) {
      results.push(parsed);
    }
  }

  return results;
}

export const importFromExcel = (file: File): Promise<Partial<Student>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const students = parseCSVToStudents(text);
          resolve(students);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
      return;
    }

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const mapped = json.map(row => mapRowToStudent(row)).filter(s => s.name || s.nis || s.nisn);
        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const importTeachersFromExcel = (file: File): Promise<Partial<Teacher>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const teachers = parseCSVToTeachers(text);
          resolve(teachers);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
      return;
    }

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const mapped = json.map(row => mapRowToTeacher(row)).filter(t => t.name || t.nip);
        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

// -------------------------------------------------------------
// ROW MAPPERS
// -------------------------------------------------------------

function mapRowToStudent(row: Record<string, any>): Partial<Student> {
  const nis = String(findVal(row, ['nopdkt', 'NIS', 'Nis', 'nis', 'No Induk', 'nomor_induk']) || '').trim();
  const nisn = String(findVal(row, ['NISN', 'Nisn', 'nisn', 'No NISN']) || '').trim();
  const nik = String(findVal(row, ['NIK', 'Nik', 'nik', 'No KTP / NIK', 'NIK Siswa']) || '').trim();
  const name = String(findVal(row, ['NamaLengkap', 'Nama Lengkap', 'Nama', 'name', 'Nama Siswa']) || '').trim();
  
  const classRaw = String(findVal(row, [
    'KelasSaatini', 'Kelas', 'kelas', 'class', 'Rombel', 'rombel',
    'Saat Ini', 'SaatIni', 'saat_ini', 'Kelas Saat Ini', 'Kelas_Saat_Ini',
    'Kelas Sekarang', 'Tingkat', 'tingkat', 'Rombel Saat Ini', 'Status Siswa / Saat Ini'
  ]) || '1A').trim();
  const sClass = normalizeClassName(classRaw) || '1A';

  const genderRaw = String(findVal(row, ['JenisKelamin', 'Jenis Kelamin', 'L/P', 'JK', 'jk', 'gender', 'Gender']) || 'L').trim().toUpperCase();
  const gender: 'L' | 'P' = (genderRaw.startsWith('P') || genderRaw === 'PEREMPUAN' || genderRaw === 'WANITA') ? 'P' : 'L';

  const pob = String(findVal(row, ['Tempat Lahir', 'TempatLahir', 'pob', 'Tempat_Lahir', 'Kota Lahir']) || '').trim();
  const dobRaw = findVal(row, ['TanggalLahir', 'Tanggal Lahir', 'Tgl Lahir', 'dob', 'Tanggal_Lahir', 'Tgl_Lahir']);
  const dob = standardizeDate(dobRaw);

  const address = String(findVal(row, ['Alamat', 'address', 'Alamat Lengkap', 'Alamat Tinggal', 'Domisili']) || '').trim();
  const parentName = String(findVal(row, ['NamaAyah', 'Nama Ayah', 'Nama Orang Tua', 'Nama Ortu', 'parentName', 'NamaWali', 'Nama Wali', 'Orang Tua']) || '').trim();

  const statusRaw = String(findVal(row, [
    'Status', 'status', 'Status Siswa', 'StatusSiswa', 'Status_Siswa',
    'Status Keaktifan', 'StatusKeaktifan', 'Status Keberadaan', 'Status Peserta Didik',
    'Keaktifan', 'Status Siswa / Saat Ini'
  ]) || 'Aktif').trim();
  let status: any = 'AKTIF';
  const stLower = statusRaw.toLowerCase();
  if (stLower.includes('tidak') || stLower.includes('non')) status = 'TIDAK AKTIF';
  else if (stLower.includes('belum')) status = 'BELUM';
  else if (stLower.includes('lulus') || stLower.includes('alumni')) status = 'LULUS';
  else if (stLower.includes('pindah') || stLower.includes('mutasi')) status = 'PINDAH';
  else if (stLower.includes('keluar') || stLower.includes('do') || stLower.includes('drop')) status = 'KELUAR';
  else if (stLower.includes('meninggal') || stLower.includes('wafat')) status = 'MENINGGAL';
  else status = 'AKTIF';

  // Tambahan Dapodik & Keluarga
  const TahunMasuk = String(findVal(row, ['TahunMasuk', 'Tahun Masuk', 'Tahun Angkatan', 'tahunMasuk', 'ThnMasuk', 'tahun_masuk', 'Angkatan']) || '').trim();
  const anakKe = findVal(row, ['Anak ke', 'AnakKe', 'Anak Ke-']);
  const saudara = findVal(row, ['Saudara', 'Jumlah Saudara', 'JumlahSaudara']);
  const agama = String(findVal(row, ['Agama', 'agama']) || 'Islam').trim();
  const golonganDarah = String(findVal(row, ['Golongan Darah', 'GolonganDarah', 'Gol Darah', 'GolDarah']) || '').trim();
  const tinggiBadan = findVal(row, ['TinggiBadan(cm)', 'Tinggi Badan', 'TinggiBadan', 'TB']);
  const beratBadan = findVal(row, ['BeratBadan(kg)', 'Berat Badan', 'BeratBadan', 'BB']);
  const prestasi = String(findVal(row, ['Prestasi', 'prestasi', 'Catatan Prestasi']) || '').trim();
  const hobi = String(findVal(row, ['Hobi', 'hobi']) || '').trim();
  const catatanPenting = String(findVal(row, ['Catatan Penting', 'CatatanPenting', 'Catatan Medis']) || '').trim();

  const rt = String(findVal(row, ['RT', 'rt']) || '').trim();
  const rw = String(findVal(row, ['RW', 'rw']) || '').trim();
  const kelurahan = String(findVal(row, ['Kelurahan', 'Desa', 'Desa/Kelurahan']) || '').trim();
  const kecamatan = String(findVal(row, ['Kecamatan', 'kecamatan']) || '').trim();
  const kota = String(findVal(row, ['Kota', 'Kabupaten', 'Kota/Kabupaten']) || '').trim();
  const provinsi = String(findVal(row, ['Provinsi', 'provinsi']) || '').trim();
  const kodePos = String(findVal(row, ['KodePos', 'Kode Pos', 'kodepos']) || '').trim();
  const jenisTinggal = String(findVal(row, ['JenisTinggal', 'Jenis Tinggal', 'Tinggal Bersama']) || '').trim();
  const alatTransportasi = String(findVal(row, ['AlatTransportasi', 'Alat Transportasi', 'Transportasi']) || '').trim();
  const noHp = String(findVal(row, ['NomorHP', 'No HP', 'NoHP', 'Telepon', 'No Telepon', 'WhatsApp', 'No WA']) || '').trim();
  const email = String(findVal(row, ['E-Mail', 'Email', 'email']) || '').trim();

  const sekolahAsal = String(findVal(row, ['AsalSekolah', 'Asal Sekolah', 'Sekolah Asal', 'sekolahAsal']) || '').trim();
  const skhun = String(findVal(row, ['SKHUN', 'skhun', 'No SKHUN']) || '').trim();
  const penerimaKps = String(findVal(row, ['PenerimaKPS', 'Penerima KPS', 'KPS', 'KIP']) || '').trim();
  const ijazahNo = String(findVal(row, ['No Ijazah', 'NoIjazah', 'ijazahNo', 'Nomor Ijazah']) || '').trim();

  // Ortu
  const noKk = String(findVal(row, ['NomorKartuKeluarga', 'No KK', 'Nomor KK', 'NoKK', 'noKk']) || '').trim();
  const namaAyah = String(findVal(row, ['NamaAyah', 'Nama Ayah', 'namaAyah']) || '').trim();
  const nikAyah = String(findVal(row, ['NIKAyah', 'NIK Ayah', 'nikAyah']) || '').trim();
  const tempatLahirAyah = String(findVal(row, ['TempatLahirAyah', 'Tempat Lahir Ayah', 'tempatLahirAyah']) || '').trim();
  const tanggalLahirAyah = String(findVal(row, ['TanggalLahirAyah', 'Tanggal Lahir Ayah', 'tanggalLahirAyah', 'TglLahirAyah']) || '').trim();
  const pendidikanAyah = String(findVal(row, ['PendidikanAyah', 'Pendidikan Ayah', 'pendidikanAyah']) || '').trim();
  const pekerjaanAyah = String(findVal(row, ['PekerjaanAyah', 'Pekerjaan Ayah', 'pekerjaanAyah']) || '').trim();
  const penghasilanAyah = String(findVal(row, ['PenghasilanAyah', 'Penghasilan Ayah', 'penghasilanAyah', 'Gaji Ayah']) || '').trim();
  const tlpAyah = String(findVal(row, ['TlpAyah', 'No HP Ayah', 'Telepon Ayah', 'tlpAyah']) || '').trim();
  const statusAyah = String(findVal(row, ['StatusAyah', 'Status Ayah', 'statusAyah', 'Kondisi Ayah']) || 'Masih Hidup').trim();

  const namaIbu = String(findVal(row, ['NamaIbu', 'Nama Ibu', 'namaIbu']) || '').trim();
  const nikIbu = String(findVal(row, ['NIKIbu', 'NIK Ibu', 'nikIbu']) || '').trim();
  const tempatLahirIbu = String(findVal(row, ['TempatLahirIbu', 'Tempat Lahir Ibu', 'tempatLahirIbu']) || '').trim();
  const tanggalLahirIbu = String(findVal(row, ['TanggalLahirIbu', 'Tanggal Lahir Ibu', 'tanggalLahirIbu', 'TglLahirIbu']) || '').trim();
  const pendidikanIbu = String(findVal(row, ['PendidikanIbu', 'Pendidikan Ibu', 'pendidikanIbu']) || '').trim();
  const pekerjaanIbu = String(findVal(row, ['PekerjaanIbu', 'Pekerjaan Ibu', 'pekerjaanIbu']) || '').trim();
  const penghasilanIbu = String(findVal(row, ['PenghasilanIbu', 'Penghasilan Ibu', 'penghasilanIbu', 'Gaji Ibu']) || '').trim();
  const tlpIbu = String(findVal(row, ['TlpIbu', 'No HP Ibu', 'Telepon Ibu', 'tlpIbu']) || '').trim();
  const statusIbu = String(findVal(row, ['StatusIbu', 'Status Ibu', 'statusIbu', 'Kondisi Ibu']) || 'Masih Hidup').trim();

  let statusYatim = String(findVal(row, ['StatusYatim', 'Status Yatim', 'statusYatim', 'Status Yatim Piatu', 'Yatim/Piatu', 'Yatim Piatu']) || '').trim();
  if (!statusYatim) {
    const aMeninggal = statusAyah.toLowerCase().includes('meninggal') || namaAyah.toLowerCase().includes('alm');
    const iMeninggal = statusIbu.toLowerCase().includes('meninggal') || namaIbu.toLowerCase().includes('alm');
    if (aMeninggal && iMeninggal) statusYatim = 'Yatim Piatu';
    else if (aMeninggal) statusYatim = 'Yatim';
    else if (iMeninggal) statusYatim = 'Piatu';
    else statusYatim = 'Lengkap';
  }

  const namaWali = String(findVal(row, ['NamaWali', 'Nama Wali', 'namaWali']) || '').trim();
  const tempatLahirWali = String(findVal(row, ['TempatLahirWali', 'Tempat Lahir Wali', 'tempatLahirWali']) || '').trim();
  const tglLahirWali = String(findVal(row, ['TglLahirWali', 'Tanggal Lahir Wali', 'TanggalLahirWali', 'tglLahirWali']) || '').trim();
  const pendidikanWali = String(findVal(row, ['PendidikanWali', 'Pendidikan Wali', 'pendidikanWali']) || '').trim();
  const pekerjaanWali = String(findVal(row, ['PekerjaanWali', 'Pekerjaan Wali', 'pekerjaanWali']) || '').trim();
  const penghasilanWali = String(findVal(row, ['PenghasilanWali', 'Penghasilan Wali', 'penghasilanWali']) || '').trim();
  const hubunganWali = String(findVal(row, ['Hubungan', 'HubunganWali', 'Hubungan Wali', 'hubunganWali']) || '').trim();
  const tlpWali = String(findVal(row, ['Tlp.Wali', 'TlpWali', 'No HP Wali', 'tlpWali']) || '').trim();

  // Berkas Dokumen
  const aktaKelahiranUrl = String(findVal(row, ['AktaKelahiran', 'Akte', 'Akta', 'akteUrl', 'Link Akta']) || '').trim();
  const kartuKeluargaUrl = String(findVal(row, ['KartuKeluarga', 'KK', 'kkUrl', 'Link KK']) || '').trim();
  const kiaUrl = String(findVal(row, ['KIA', 'kiaUrl', 'KTP Anak', 'Link KIA']) || '').trim();
  const ktpAyahUrl = String(findVal(row, ['KTPAyah', 'KTP Ayah', 'ktpAyahUrl']) || '').trim();
  const ktpIbuUrl = String(findVal(row, ['KTPIbu', 'KTP Ibu', 'ktpIbuUrl']) || '').trim();
  const ktpWaliUrl = String(findVal(row, ['KTPWali', 'KTP Wali', 'ktpWaliUrl']) || '').trim();
  const ijazahUrl = String(findVal(row, ['Ijazah', 'ijazahUrl', 'Link Ijazah']) || '').trim();
  const raporUrl = String(findVal(row, ['Rapor', 'Rapot', 'raporUrl', 'rapotUrl', 'Link Rapor']) || '').trim();
  const suratPindahUrl = String(findVal(row, ['S.Pindah', 'Surat Pindah', 'suratPindahUrl']) || '').trim();
  const suKetUrl = String(findVal(row, ['SuKet', 'Surat Keterangan', 'suKetUrl', 'dokumenLainUrl']) || '').trim();
  const suratDomisiliUrl = String(findVal(row, ['S.Domisili', 'Surat Domisili', 'suratDomisiliUrl']) || '').trim();
  const formPendaftaranUrl = String(findVal(row, ['FormPendaftaran', 'Form', 'Formulir', 'formPendaftaranUrl', 'formUrl']) || '').trim();
  const suratPernyataanUrl = String(findVal(row, ['SPernyataan', 'S.Pernyataan', 'Surat Pernyataan', 'suratPernyataanUrl', 'sPernyataanUrl']) || '').trim();
  const suratKesanggupanUrl = String(findVal(row, ['SKesanggupan', 'S.Kesanggupan', 'Surat Kesanggupan', 'suratKesanggupanUrl', 'sKesanggupanUrl']) || '').trim();
  const berkasLainnyaUrl = String(findVal(row, ['BerkasLainnya', 'Berkas Lainnya', 'Dokumen Lain', 'berkasLainnyaUrl']) || '').trim();
  const fotoUrl = String(findVal(row, ['PasFoto', 'Pas Foto', 'Foto', 'fotoUrl']) || '').trim();

  return {
    nis,
    nisn: nisn || undefined,
    nik: nik || undefined,
    name,
    class: sClass,
    gender,
    pob: pob || undefined,
    dob,
    address,
    parentName: parentName || namaAyah || namaIbu || 'Orang Tua',
    status,
    tahunMasuk: TahunMasuk || undefined,
    TahunMasuk: TahunMasuk || undefined,
    anakKe: anakKe || undefined,
    saudara: saudara || undefined,
    agama: agama || undefined,
    golonganDarah: golonganDarah || undefined,
    tinggiBadan: tinggiBadan || undefined,
    beratBadan: beratBadan || undefined,
    prestasi: prestasi || undefined,
    hobi: hobi || undefined,
    catatanPenting: catatanPenting || undefined,
    rt: rt || undefined,
    rw: rw || undefined,
    kelurahan: kelurahan || undefined,
    kecamatan: kecamatan || undefined,
    kota: kota || undefined,
    provinsi: provinsi || undefined,
    kodePos: kodePos || undefined,
    jenisTinggal: jenisTinggal || undefined,
    alatTransportasi: alatTransportasi || undefined,
    noHp: noHp || undefined,
    email: email || undefined,
    sekolahAsal: sekolahAsal || undefined,
    skhun: skhun || undefined,
    penerimaKps: penerimaKps || undefined,
    ijazahNo: ijazahNo && ijazahNo !== '-' ? ijazahNo : undefined,
    noKk: noKk || undefined,
    namaAyah: namaAyah || undefined,
    nikAyah: nikAyah || undefined,
    tempatLahirAyah: tempatLahirAyah || undefined,
    tanggalLahirAyah: tanggalLahirAyah || undefined,
    pendidikanAyah: pendidikanAyah || undefined,
    pekerjaanAyah: pekerjaanAyah || undefined,
    penghasilanAyah: penghasilanAyah || undefined,
    tlpAyah: tlpAyah || undefined,
    statusAyah: statusAyah || 'Masih Hidup',
    namaIbu: namaIbu || undefined,
    nikIbu: nikIbu || undefined,
    tempatLahirIbu: tempatLahirIbu || undefined,
    tanggalLahirIbu: tanggalLahirIbu || undefined,
    pendidikanIbu: pendidikanIbu || undefined,
    pekerjaanIbu: pekerjaanIbu || undefined,
    penghasilanIbu: penghasilanIbu || undefined,
    tlpIbu: tlpIbu || undefined,
    statusIbu: statusIbu || 'Masih Hidup',
    statusYatim: statusYatim || 'Lengkap',
    namaWali: namaWali || undefined,
    tempatLahirWali: tempatLahirWali || undefined,
    tglLahirWali: tglLahirWali || undefined,
    pendidikanWali: pendidikanWali || undefined,
    pekerjaanWali: pekerjaanWali || undefined,
    penghasilanWali: penghasilanWali || undefined,
    hubunganWali: hubunganWali || undefined,
    tlpWali: tlpWali || undefined,
    aktaKelahiranUrl: aktaKelahiranUrl || undefined,
    akteUrl: aktaKelahiranUrl || undefined,
    kartuKeluargaUrl: kartuKeluargaUrl || undefined,
    kkUrl: kartuKeluargaUrl || undefined,
    kiaUrl: kiaUrl || undefined,
    ktpAyahUrl: ktpAyahUrl || undefined,
    ktpIbuUrl: ktpIbuUrl || undefined,
    ktpWaliUrl: ktpWaliUrl || undefined,
    ijazahUrl: ijazahUrl || undefined,
    raporUrl: raporUrl || undefined,
    rapotUrl: raporUrl || undefined,
    suratPindahUrl: suratPindahUrl || undefined,
    suKetUrl: suKetUrl || undefined,
    suratDomisiliUrl: suratDomisiliUrl || undefined,
    formPendaftaranUrl: formPendaftaranUrl || undefined,
    suratPernyataanUrl: suratPernyataanUrl || undefined,
    suratKesanggupanUrl: suratKesanggupanUrl || undefined,
    berkasLainnyaUrl: berkasLainnyaUrl || undefined,
    dokumenLainUrl: suKetUrl || undefined,
    fotoUrl: fotoUrl || undefined
  };
}

function mapRowToTeacher(row: Record<string, any>): Partial<Teacher> {
  const rawId = String(findVal(row, ['GuruID', 'ID', 'id', 'guruId']) || '').trim();
  const nip = String(findVal(row, ['NIP', 'Nip', 'nip', 'NUPTK', 'nuptk', 'GuruID', 'ID']) || '').trim();
  const nik = String(findVal(row, ['NIK', 'Nik', 'nik']) || '').trim();
  const nuptk = String(findVal(row, ['NUPTK', 'nuptk', 'Nuptk']) || '').trim();
  const name = String(findVal(row, ['Nama', 'Nama Lengkap', 'NamaLengkap', 'name', 'Nama Guru', 'nama']) || '').trim();
  const gelar = String(findVal(row, ['Gelar', 'Gelar Akademik', 'gelar', 'gelarAkademik']) || '').trim();
  
  const genderRaw = String(findVal(row, ['JenisKelamin', 'Jenis Kelamin', 'L/P', 'JK', 'gender']) || 'L').trim().toUpperCase();
  const gender: 'L' | 'P' = (genderRaw.startsWith('P') || genderRaw === 'PEREMPUAN' || genderRaw === 'WANITA') ? 'P' : 'L';

  const tempatLahir = String(findVal(row, ['TempatLahir', 'Tempat Lahir', 'tempatLahir', 'pob']) || '').trim();
  const tanggalLahir = standardizeDate(findVal(row, ['TanggalLahir', 'Tanggal Lahir', 'tanggalLahir', 'dob']));
  const agama = String(findVal(row, ['Agama', 'agama']) || 'Islam').trim();
  const alamat = String(findVal(row, ['Alamat', 'alamat', 'address']) || '').trim();
  const phone = String(findVal(row, ['NoHP', 'No HP', 'No Telepon', 'Telepon', 'phone', 'WA', 'WhatsApp', 'noHp']) || '').trim();
  const email = String(findVal(row, ['Email', 'email', 'E-Mail']) || '').trim();
  const pendidikan = String(findVal(row, ['Pendidikan', 'pendidikan', 'Pendidikan Terakhir']) || 'S1').trim();
  const jurusan = String(findVal(row, ['Jurusan', 'jurusan', 'Program Studi', 'Prodi']) || '').trim();
  const statusKepegawaian = String(findVal(row, ['StatusKepegawaian', 'Status Kepegawaian', 'statusKepegawaian', 'Kepegawaian']) || 'Tetap').trim();
  const tmt = standardizeDate(findVal(row, ['TMT', 'tmt', 'Tgl Mulai Tugas', 'Tanggal Mulai Tugas']));

  let assignedClassRaw = String(findVal(row, ['Jabatan', 'Wali Kelas / Jabatan', 'Wali Kelas', 'WaliKelas', 'Kelas', 'class', 'jabatan']) || 'None').trim();
  let assignedClass = 'None';
  if (assignedClassRaw.toUpperCase().includes('KEPALA') || assignedClassRaw.toUpperCase() === 'KS') {
    assignedClass = 'Kepala Sekolah';
  } else if (assignedClassRaw.toUpperCase() === 'NONE' || assignedClassRaw === '-' || !assignedClassRaw) {
    assignedClass = 'None';
  } else if (/^[1-6][A-Z]?$/i.test(assignedClassRaw) || assignedClassRaw.toUpperCase().startsWith('KELAS')) {
    assignedClass = assignedClassRaw.toUpperCase().replace(/KELAS/g, '').replace(/[-_]/g, '').trim() || 'None';
  } else {
    assignedClass = assignedClassRaw;
  }

  const statusRaw = String(findVal(row, ['Status', 'status']) || 'Aktif').trim().toLowerCase();
  const status: 'Aktif' | 'Nonaktif' = statusRaw.includes('non') ? 'Nonaktif' : 'Aktif';
  const fotoUrl = String(findVal(row, ['Foto', 'Foto Guru', 'fotoUrl', 'Foto Profil', 'foto']) || '').trim();

  return {
    id: rawId || undefined,
    nip: nip || nuptk || nik || '',
    nik: nik || undefined,
    nuptk: nuptk || undefined,
    name,
    gelar: gelar || undefined,
    gender,
    tempatLahir: tempatLahir || undefined,
    tanggalLahir: tanggalLahir || undefined,
    agama: agama || undefined,
    alamat: alamat || undefined,
    class: assignedClass,
    phone,
    email,
    pendidikan: pendidikan || undefined,
    jurusan: jurusan || undefined,
    jabatan: assignedClass,
    statusKepegawaian: statusKepegawaian || undefined,
    tmt: tmt || undefined,
    status,
    fotoUrl: fotoUrl || undefined
  };
}

// -------------------------------------------------------------
// EXTRA MODULE TEMPLATES (Sarpras, BK, CBT, Dokumen, SPMB)
// -------------------------------------------------------------

export const downloadSarprasExcelTemplate = (filename: string = 'Template_Import_Sarpras_Sekolah.xlsx') => {
  const headers = [
    "Kode Barang", "Nama Barang", "Kategori", "Jumlah Unit", "Satuan", 
    "Kondisi", "Lokasi Ruangan", "Penanggung Jawab", "Sumber Dana", "Harga Satuan", "Tahun Pengadaan"
  ];
  const ws = XLSX.utils.json_to_sheet([], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Master Sarpras");
  XLSX.writeFile(wb, filename);
};

export const downloadBkExcelTemplate = (filename: string = 'Template_Import_Catatan_BK_Konseling.xlsx') => {
  const headers = [
    "NISN", "Nama Siswa", "Kelas", "Tanggal Kejadian", "Kategori", 
    "Uraian Kasus / Masalah", "Poin Pelanggaran", "Tindakan / Solusi BK", "Guru BK Konselor", "Status Kasus"
  ];
  const ws = XLSX.utils.json_to_sheet([], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Catatan BK");
  XLSX.writeFile(wb, filename);
};

export const downloadCbtQuestionExcelTemplate = (filename: string = 'Template_Bank_Soal_Ujian_CBT.xlsx') => {
  const headers = [
    "No Soal", "Mata Pelajaran", "Tingkat Kelas", "Jenis Soal", "Pertanyaan", 
    "Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D", "Pilihan E", "Kunci Jawaban", "Bobot Skor"
  ];
  const sampleData = [
    {
      "No Soal": 1,
      "Mata Pelajaran": "Informatika",
      "Tingkat Kelas": "X",
      "Jenis Soal": "Pilihan Ganda",
      "Pertanyaan": "Perangkat lunak yang digunakan untuk mengelola basis data disebut...",
      "Pilihan A": "Operating System",
      "Pilihan B": "DBMS",
      "Pilihan C": "Compiler",
      "Pilihan D": "Spreadsheet",
      "Pilihan E": "Firmware",
      "Kunci Jawaban": "B",
      "Bobot Skor": 10
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bank Soal CBT");
  XLSX.writeFile(wb, filename);
};

export const downloadDokumenSuratExcelTemplate = (filename: string = 'Template_Agenda_Dokumen_Persuratan.xlsx') => {
  const headers = [
    "Nomor Surat", "Jenis Dokumen", "Tanggal Surat", "Perihal / Isi Ringkas", 
    "Asal / Tujuan Surat", "Sifat Surat", "Status Disposisi", "Penanggung Jawab"
  ];
  const sampleData = [
    {
      "Nomor Surat": "421/045/SMK-TB/I/2025",
      "Jenis Dokumen": "Surat Keluar",
      "Tanggal Surat": "2025-01-10",
      "Perihal / Isi Ringkas": "Permohonan Tempat PKL / Magang Siswa",
      "Asal / Tujuan Surat": "PT Telkom Indonesia",
      "Sifat Surat": "Penting",
      "Status Disposisi": "Disetujui Kepala Sekolah",
      "Penanggung Jawab": "Humas & Hubin"
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Agenda Surat");
  XLSX.writeFile(wb, filename);
};

export const downloadSpmbExcelTemplate = (filename: string = 'Template_Import_Pendaftar_SPMB.xlsx') => {
  const headers = [
    "Nomor Pendaftaran", "Nama Calon Siswa", "NISN", "NIK", "Jenis Kelamin", 
    "Tempat Lahir", "Tanggal Lahir", "Asal Sekolah", "Pilihan Jurusan", "Nama Orang Tua", "No HP / WA", "Jalur Seleksi"
  ];
  const sampleData = [
    {
      "Nomor Pendaftaran": "SPMB-2025-001",
      "Nama Calon Siswa": "Bagus Satria",
      "NISN": "0098765432",
      "NIK": "3201123456780001",
      "Jenis Kelamin": "L",
      "Tempat Lahir": "Jakarta",
      "Tanggal Lahir": "2010-05-12",
      "Asal Sekolah": "SMP Negeri 1 Tambora",
      "Pilihan Jurusan": "Rekayasa Perangkat Lunak",
      "Nama Orang Tua": "Bambang Supriyanto",
      "No HP / WA": "081234567890",
      "Jalur Seleksi": "Prestasi Akademik"
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pendaftar SPMB");
  XLSX.writeFile(wb, filename);
};

export const downloadPerpusExcelTemplate = (filename: string = 'Template_Perpustakaan_Digital.xlsx') => {
  const headersBuku = [
    "Kode Buku", "ISBN", "Judul Buku", "Pengarang", "Penerbit", "Tahun Terbit", 
    "Kategori", "Lokasi Rak", "Stok Total", "Stok Tersedia", "Deskripsi"
  ];
  const sampleBuku = [
    {
      "Kode Buku": "BK-001",
      "ISBN": "978-602-298-001-1",
      "Judul Buku": "Informatika & Pemrograman Web Modern",
      "Pengarang": "Prof. Dr. Suprayitno",
      "Penerbit": "Erlangga",
      "Tahun Terbit": "2024",
      "Kategori": "Buku Paket/Pelajaran",
      "Lokasi Rak": "Rak A-01",
      "Stok Total": 25,
      "Stok Tersedia": 25,
      "Deskripsi": "Buku pegangan pembelajaran coding dan web"
    }
  ];

  const headersPinjam = [
    "Kode Peminjaman", "Kode Buku", "Judul Buku", "Tipe Peminjam", "Nama Peminjam", 
    "Kelas / Departemen", "Tanggal Pinjam", "Tenggat Kembali", "Status", "Denda", "Catatan"
  ];
  const samplePinjam = [
    {
      "Kode Peminjaman": "PJM-2026-001",
      "Kode Buku": "BK-001",
      "Judul Buku": "Informatika & Pemrograman Web Modern",
      "Tipe Peminjam": "Siswa",
      "Nama Peminjam": "Ahmad Fauzi",
      "Kelas / Departemen": "Kelas VII-A",
      "Tanggal Pinjam": "2026-08-20",
      "Tenggat Kembali": "2026-08-27",
      "Status": "Dipinjam",
      "Denda": 0,
      "Catatan": "Peminjaman modul praktikum"
    }
  ];

  const wb = XLSX.utils.book_new();
  const wsBuku = XLSX.utils.json_to_sheet(sampleBuku, { header: headersBuku });
  const wsPinjam = XLSX.utils.json_to_sheet(samplePinjam, { header: headersPinjam });
  XLSX.utils.book_append_sheet(wb, wsBuku, "Katalog Buku");
  XLSX.utils.book_append_sheet(wb, wsPinjam, "Sirkulasi Peminjaman");
  XLSX.writeFile(wb, filename);
};

export const downloadWaNotificationExcelTemplate = (filename: string = 'Template_Log_WhatsApp_Gateway.xlsx') => {
  const headers = [
    "ID Pesan", "Kategori", "Nama Penerima", "Peran Penerima", "Nomor WhatsApp", "Isi Pesan", "Status", "Waktu Kirim", "Pengirim"
  ];
  const sampleData = [
    {
      "ID Pesan": "WA-2026-001",
      "Kategori": "Presensi",
      "Nama Penerima": "Bapak Suryanto",
      "Peran Penerima": "Orang Tua",
      "Nomor WhatsApp": "081234567890",
      "Isi Pesan": "Bapak/Ibu Orang Tua dari Ahmad Fauzi (Kelas VII-A), ananda telah hadir dan presensi di sekolah pukul 07.10 WIB.",
      "Status": "Terkirim",
      "Waktu Kirim": "2026-08-25 07:15",
      "Pengirim": "Sistem Presensi Otomatis"
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Log Pesan WA");
  XLSX.writeFile(wb, filename);
};

export const downloadEkskulExcelTemplate = (filename: string = 'Template_Ekstrakurikuler_dan_OSIS.xlsx') => {
  const headersEkskul = [
    "Kode Ekskul", "Nama Ekskul", "Kategori", "Nama Pembina", "Hari Latihan", 
    "Waktu Latihan", "Tempat Latihan", "Kuota", "Status"
  ];
  const sampleEkskul = [
    {
      "Kode Ekskul": "EKS-001",
      "Nama Ekskul": "Pramuka Inti & Dewan Penggalang",
      "Kategori": "Wajib",
      "Nama Pembina": "Kak Budi Santoso, S.Pd",
      "Hari Latihan": "Jumat",
      "Waktu Latihan": "14.30 - 16.30 WIB",
      "Tempat Latihan": "Lapangan Utama",
      "Kuota": 100,
      "Status": "Aktif"
    }
  ];

  const headersAnggota = [
    "Kode Ekskul", "Nama Ekskul", "NIS", "Nama Siswa", "Kelas", "Jabatan", "Tanggal Bergabung", "Nilai Rapor", "Keterangan"
  ];
  const sampleAnggota = [
    {
      "Kode Ekskul": "EKS-001",
      "Nama Ekskul": "Pramuka Inti & Dewan Penggalang",
      "NIS": "2026001",
      "Nama Siswa": "Ahmad Fauzi",
      "Kelas": "VII-A",
      "Jabatan": "Pratama / Ketua",
      "Tanggal Bergabung": "2026-07-15",
      "Nilai Rapor": "A",
      "Keterangan": "Sangat aktif dalam kegiatan perkemahan dan kepemimpinan"
    }
  ];

  const wb = XLSX.utils.book_new();
  const wsEkskul = XLSX.utils.json_to_sheet(sampleEkskul, { header: headersEkskul });
  const wsAnggota = XLSX.utils.json_to_sheet(sampleAnggota, { header: headersAnggota });
  XLSX.utils.book_append_sheet(wb, wsEkskul, "Master Ekskul");
  XLSX.utils.book_append_sheet(wb, wsAnggota, "Anggota & Nilai Rapor");
  XLSX.writeFile(wb, filename);
};

export const downloadMadingExcelTemplate = (filename: string = 'Template_Mading_dan_Berita_Digital.xlsx') => {
  const headers = [
    "ID Mading", "Judul Pengumuman/Berita", "Kategori", "Konten Lengkap", "Penulis", 
    "Peran Penulis", "Tanggal Publikasi", "Status", "Prioritas", "Target Audiens", "URL Gambar"
  ];
  const sampleData = [
    {
      "ID Mading": "MAD-001",
      "Judul Pengumuman/Berita": "Pemberitahuan Asesmen Sumatif Tengah Semester Ganjil",
      "Kategori": "Pengumuman",
      "Konten Lengkap": "Diberitahukan kepada seluruh peserta didik bahwa Asesmen Sumatif akan dilaksanakan mulai hari Senin mendatang.",
      "Penulis": "Humas Sekolah",
      "Peran Penulis": "Admin",
      "Tanggal Publikasi": "2026-08-25",
      "Status": "Publish",
      "Prioritas": "Penting",
      "Target Audiens": "Semua",
      "URL Gambar": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80"
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mading & Berita");
  XLSX.writeFile(wb, filename);
};

export const downloadPortalPublikExcelTemplate = (filename: string = 'Template_Portal_Publik_dan_Website.xlsx') => {
  const headersConfig = [
    "Key Konfigurasi", "Nama Sekolah", "Tagline", "Visi", "Misi", "Alamat Lengkap", "Nomor Telepon", "Email Resmi", "Instagram", "YouTube", "Judul Banner", "Subjudul Banner", "URL Logo", "URL Foto Banner", "URL Video Profil", "Sambutan Kepala Sekolah", "Teks Berjalan"
  ];
  const sampleConfig = [
    {
      "Key Konfigurasi": "DEFAULT_CONFIG",
      "Nama Sekolah": "ROMBEL TAMBORA",
      "Tagline": "Mewujudkan Generasi Mandiri, Berprestasi, dan Berkarakter Mulia",
      "Visi": "Menjadi institusi pendidikan vokasi dan umum terdepan yang berdaya saing global.",
      "Misi": "1. Pembelajaran berbasis industri\n2. Pendidikan akhlak dan karakter\n3. Pengabdian masyarakat",
      "Alamat Lengkap": "Jl. Pendidikan No. 1, Tambora, Jakarta Barat",
      "Nomor Telepon": "021-12345678",
      "Email Resmi": "info@sekolah.sch.id",
      "Instagram": "@sekolah_official",
      "YouTube": "Sekolah Official Channel",
      "Judul Banner": "Selamat Datang di Portal Resmi Sekolah",
      "Subjudul Banner": "Pusat Informasi Akademik, PPDB Online, dan Layanan Pendidikan Terpadu",
      "URL Logo": "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200",
      "URL Foto Banner": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200",
      "URL Video Profil": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "Sambutan Kepala Sekolah": "Selamat datang di era digitalisasi manajemen sekolah yang transparan, akuntabel, dan modern.",
      "Teks Berjalan": "Selamat datang di Portal Informasi Sekolah. Penerimaan Peserta Didik Baru (PPDB) telah dibuka!"
    }
  ];

  const headersSuara = [
    "ID", "Nama Lengkap", "Peran / Hubungan", "Teks Suara Komunitas", "Status Moderasi", "Tanggal Kirim"
  ];
  const sampleSuara = [
    {
      "ID": "SK-001",
      "Nama Lengkap": "Drs. Hendra Gunawan",
      "Peran / Hubungan": "Alumni / Tokoh Masyarakat",
      "Teks Suara Komunitas": "Sangat bangga melihat perkembangan fasilitas dan pembelajaran digital di sekolah ini.",
      "Status Moderasi": "Disetujui",
      "Tanggal Kirim": "2026-08-20"
    }
  ];

  const wb = XLSX.utils.book_new();
  const wsConfig = XLSX.utils.json_to_sheet(sampleConfig, { header: headersConfig });
  const wsSuara = XLSX.utils.json_to_sheet(sampleSuara, { header: headersSuara });
  XLSX.utils.book_append_sheet(wb, wsConfig, "Konfigurasi Website");
  XLSX.utils.book_append_sheet(wb, wsSuara, "Suara Komunitas");
  XLSX.writeFile(wb, filename);
};

// ==========================================
// UNIVERSAL HANDLERS FOR ALL 78 MASTER TABLES
// ==========================================

export const MASTER_TABLE_SCHEMAS_MAP: Record<string, string[]> = MASTER_TABLES_60.reduce((acc, t) => {
  acc[t.name] = [...t.headers];
  return acc;
}, {} as Record<string, string[]>);

export const exportGenericTableToExcel = (tableName: string, data: any[], filename?: string) => {
  const finalFilename = filename || `${tableName}_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const schemaHeaders = MASTER_TABLE_SCHEMAS_MAP[tableName] || (data.length > 0 ? Object.keys(data[0]) : []);

  const formattedData = data.map((item, idx) => {
    const row: Record<string, any> = {};
    if (schemaHeaders.length > 0) {
      schemaHeaders.forEach(h => {
        let val = item[h];
        if (val === undefined || val === null) {
          // Check common fallbacks
          const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          const foundKey = Object.keys(item).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanH);
          val = foundKey ? item[foundKey] : '';
        }
        row[h] = val;
      });
    } else {
      return item;
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(formattedData.length > 0 ? formattedData : [{}], {
    header: schemaHeaders.length > 0 ? schemaHeaders : undefined
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tableName.slice(0, 31));
  XLSX.writeFile(wb, finalFilename);
};

export const downloadMasterTableTemplate = (tableName: string, filename?: string) => {
  const finalFilename = filename || `Template_${tableName}.xlsx`;
  const schema = MASTER_TABLES_60.find(t => t.name.toUpperCase() === tableName.toUpperCase());
  const headers = schema ? schema.headers : (MASTER_TABLE_SCHEMAS_MAP[tableName] || ["ID", "Nama", "Keterangan"]);

  // Create 1 dummy sample row
  const sampleRow: Record<string, any> = {};
  headers.forEach((h, idx) => {
    if (h.toLowerCase().includes('id')) sampleRow[h] = `${tableName.substring(0, 3).toUpperCase()}-001`;
    else if (h.toLowerCase().includes('nama')) sampleRow[h] = `Contoh Data 1`;
    else if (h.toLowerCase().includes('tanggal') || h.toLowerCase().includes('tmt') || h.toLowerCase().includes('created')) sampleRow[h] = '2026-01-01';
    else if (h.toLowerCase().includes('status')) sampleRow[h] = 'Aktif';
    else if (h.toLowerCase().includes('nominal') || h.toLowerCase().includes('biaya') || h.toLowerCase().includes('kkm') || h.toLowerCase().includes('jumlah')) sampleRow[h] = 10000;
    else sampleRow[h] = '-';
  });

  const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tableName.slice(0, 31));
  XLSX.writeFile(wb, finalFilename);
};

export const exportDapodikValidasiToExcel = (data: any[], filename: string = 'DAPODIK_VALIDASI.xlsx') => {
  const headers = [
    "ValidasiID", "SiswaID", "NISN", "NIK", "NoKK", "NamaSiswa", 
    "NamaIbuKandung", "TanggalLahir", "StatusDapodik", "CatatanInvalid", 
    "TglValidasi", "UpdatedAt", "TahunAjaran", "Buktiterdaftar"
  ];

  const rows = data.map((item, idx) => ({
    "ValidasiID": item.ValidasiID || `VAL-${item.id || item.SiswaID || idx + 1}`,
    "SiswaID": item.SiswaID || item.studentId || item.id || `SISWA-${idx + 1}`,
    "NISN": item.NISN || item.nisn || '-',
    "NIK": item.NIK || item.nik || '-',
    "NoKK": item.NoKK || item.noKk || '-',
    "NamaSiswa": item.NamaSiswa || item.name || 'Siswa',
    "NamaIbuKandung": item.NamaIbuKandung || item.namaIbu || item.NamaIbu || '-',
    "TanggalLahir": item.TanggalLahir || item.birthDate || item.dob || '-',
    "StatusDapodik": item.StatusDapodik || (item.overallStatus === 'SIAP_SINKRON' ? 'Valid' : item.overallStatus === 'PERINGATAN' ? 'Peringatan' : item.overallStatus === 'RESIDU_DAPODIK' ? 'Residu' : 'Belum Terdata'),
    "CatatanInvalid": item.CatatanInvalid || item.summaryReason || (item.suggestions ? item.suggestions.join('; ') : '-'),
    "TglValidasi": item.TglValidasi || new Date().toISOString().slice(0, 10),
    "UpdatedAt": item.UpdatedAt || item.updatedAt || new Date().toISOString(),
    "TahunAjaran": item.TahunAjaran || item.tahunMasuk || item.TahunMasuk || '2026/2027',
    "Buktiterdaftar": item.Buktiterdaftar || (item.overallStatus === 'SIAP_SINKRON' ? 'Terdaftar Valid di Dapodik Pusat & Verval PD' : 'Menunggu Verval PD')
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws['!cols'] = [
    { wch: 14 }, // ValidasiID
    { wch: 14 }, // SiswaID
    { wch: 14 }, // NISN
    { wch: 20 }, // NIK
    { wch: 20 }, // NoKK
    { wch: 26 }, // NamaSiswa
    { wch: 22 }, // NamaIbuKandung
    { wch: 14 }, // TanggalLahir
    { wch: 16 }, // StatusDapodik
    { wch: 40 }, // CatatanInvalid
    { wch: 14 }, // TglValidasi
    { wch: 24 }, // UpdatedAt
    { wch: 14 }, // TahunAjaran
    { wch: 35 }, // Buktiterdaftar
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DAPODIK_VALIDASI");
  XLSX.writeFile(wb, filename);
};


