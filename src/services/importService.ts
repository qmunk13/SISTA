import * as XLSX from 'xlsx';
import { StudentProfile, JenjangType } from '../types';

export interface ImportParseResult {
  success: boolean;
  students: StudentProfile[];
  totalRows: number;
  validCount: number;
  ignoredCount: number;
  detectedHeaders: string[];
  is70ColumnsFormat: boolean;
  errors: string[];
  warnings: string[];
}

export const ImportService = {
  // Normalize header string: lowercase, remove non-alphanumeric
  normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  },

  // Derive Jenjang based on class string or explicit text
  determineJenjang(rawJenjang?: string, rawKelas?: string): JenjangType {
    const k = (rawKelas || '').trim();
    const j = (rawJenjang || '').toUpperCase().trim();

    if (j.includes('PAKET A') || j === 'SD' || ['1', '2', '3', '4', '5', '6'].includes(k)) {
      return 'Paket A';
    }
    if (j.includes('PAKET B') || j === 'SMP' || ['7', '8', '9'].includes(k)) {
      return 'Paket B';
    }
    if (j.includes('PAKET C') || j === 'SMA' || j === 'SMK' || ['10', '11', '12'].includes(k)) {
      return 'Paket C';
    }
    return 'Paket B';
  },

  // Map arbitrary row object (from Excel or CSV with headers) into StudentProfile
  mapRowToStudent(row: Record<string, any>, index: number): StudentProfile | null {
    const normMap: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      const nKey = this.normalizeKey(key);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        normMap[nKey] = String(val).trim().replace(/^'/, '');
      }
    }

    // Extract NISN & Nama (mandatory)
    const nisn =
      normMap['nisn'] ||
      normMap['nomornisn'] ||
      normMap['nonisn'] ||
      normMap['iduser'] ||
      normMap['nis'] ||
      '';

    const nama =
      normMap['namalengkap'] ||
      normMap['nama'] ||
      normMap['namasiswa'] ||
      normMap['namapesertadidik'] ||
      '';

    if (!nisn || !nama) {
      return null;
    }

    const cleanNisn = nisn.replace(/[^0-9]/g, '');
    const cleanNama = nama.replace(/['"]/g, '').trim();

    const rawKelas = normMap['kelassaatini'] || normMap['kelas'] || normMap['tingkat'] || '9';
    const cleanKelas = rawKelas.replace(/[^0-9]/g, '') || rawKelas;
    const rawJenjang = normMap['jenjang'] || normMap['paket'] || '';
    const jenjang = this.determineJenjang(rawJenjang, cleanKelas);

    const tahunMasuk = normMap['tahunmasuk'] || normMap['thnmasuk'] || '2025';
    const nopdkt =
      normMap['nopdkt'] ||
      normMap['noinduk'] ||
      normMap['nopokok'] ||
      `KTCT-${tahunMasuk}-${cleanNisn.slice(-4) || String(index + 1).padStart(4, '0')}`;

    const jkRaw = (normMap['jeniskelamin'] || normMap['jk'] || normMap['lp'] || normMap['sex'] || 'L').toUpperCase();
    const jenisKelamin: 'L' | 'P' = jkRaw.startsWith('P') || jkRaw === 'PEREMPUAN' ? 'P' : 'L';

    // Wali & Kontak
    const rawWali = normMap['namawali'] || normMap['walimurid'] || normMap['wali'] || '';
    const statusWords = ['yatim', 'lengkap', 'piatu', 'yatim piatu', 'ada', 'tidak ada'];
    const isStatusWord = statusWords.includes(rawWali.toLowerCase().trim());
    
    // Status yatim
    const detectedStatusYatim = normMap['statusyatim'] || normMap['keadaanorangtua'] || (isStatusWord ? rawWali : 'Lengkap');
    
    // Actual wali/parent name
    let namaWali = isStatusWord ? '' : rawWali;
    if (!namaWali || namaWali === '-') {
      const ayah = normMap['namaayah'] || normMap['ayah'];
      const ibu = normMap['namaibu'] || normMap['ibu'];
      if (ayah && !statusWords.includes(ayah.toLowerCase().trim())) {
        namaWali = ayah;
      } else if (ibu && !statusWords.includes(ibu.toLowerCase().trim())) {
        namaWali = ibu;
      } else {
        namaWali = '-';
      }
    }

    const tlpWali =
      normMap['tlpwali'] ||
      normMap['teleponwali'] ||
      normMap['nohpwali'] ||
      normMap['hptelp'] ||
      normMap['notelp'] ||
      normMap['nomorhp'] ||
      normMap['nohp'] ||
      '-';

    // Foto - detect all common photo headers (Foto, Pas Foto, Link Foto, Google Drive, etc.)
    const customFoto = (
      normMap['linkfoto'] ||
      normMap['pasfoto'] ||
      normMap['foto'] ||
      normMap['fotosiswa'] ||
      normMap['pasfotosiswa'] ||
      normMap['linkfotosiswa'] ||
      normMap['linkpasfoto'] ||
      normMap['urlfoto'] ||
      normMap['photo'] ||
      normMap['image'] ||
      normMap['drivefoto'] ||
      normMap['googledrivefoto'] ||
      normMap['linkgoogledrive'] ||
      normMap['berkasfoto'] ||
      ''
    ).trim();
    let foto = '';
    if (customFoto.startsWith('data:') || customFoto.startsWith('http')) {
      if (!customFoto.includes('images.unsplash.com')) {
        foto = customFoto;
      }
    }

    const student: StudentProfile = {
      id: 'STD-' + cleanNisn,
      nisn: cleanNisn,
      nama: cleanNama,
      namaLengkap: cleanNama,
      jenjang,
      kelas: cleanKelas,
      kelasSaatini: cleanKelas,
      rombel: normMap['rombel'] || 'Rombel KTCT Tambora',
      status: (normMap['status'] as any) || 'AKTIF',
      linkFoto: foto,
      pasFoto: foto,
      waliMurid: namaWali,
      teleponWali: tlpWali,

      // 1. Identitas & Registrasi
      nopdkt,
      tahunMasuk,
      jenisKelamin,
      tempatLahir: normMap['tempatlahir'] || normMap['tmplahir'] || 'Jakarta',
      tanggalLahir: normMap['tanggallahir'] || normMap['tgllahir'] || '2010-01-01',
      nik: normMap['nik'] || normMap['niksiswa'] || `317301${cleanNisn}`,
      anakKe: normMap['anakke'] ? parseInt(normMap['anakke'], 10) : 1,
      saudara: normMap['saudara'] || normMap['jumlahsaudara'] ? parseInt(normMap['saudara'] || normMap['jumlahsaudara'], 10) : 2,
      agama: (normMap['agama'] as any) || 'Islam',
      golonganDarah: (normMap['golongandarah'] || normMap['goldarah'] as any) || 'O',
      tinggiBadan: normMap['tinggibadancm'] || normMap['tinggibadan'] ? parseFloat(normMap['tinggibadancm'] || normMap['tinggibadan']) : 155,
      beratBadan: normMap['beratbadankg'] || normMap['beratbadan'] ? parseFloat(normMap['beratbadankg'] || normMap['beratbadan']) : 48,
      prestasi: normMap['prestasi'] || '-',
      hobi: normMap['hobi'] || '-',
      catatanPenting: normMap['catatanpenting'] || normMap['catatan'] || '-',

      // 2. Alamat & Kontak
      alamat: normMap['alamat'] || normMap['alamatsiswa'] || 'Jl. Tambora Raya',
      rt: normMap['rt'] || '005',
      rw: normMap['rw'] || '03',
      kelurahan: normMap['kelurahan'] || normMap['desa'] || 'Tambora',
      kecamatan: normMap['kecamatan'] || 'Tambora',
      kota: normMap['kota'] || normMap['kabupaten'] || 'Jakarta Barat',
      provinsi: normMap['provinsi'] || 'DKI Jakarta',
      kodePos: normMap['kodepos'] || '11220',
      jenisTinggal: normMap['jenistinggal'] || 'Bersama Orang Tua',
      alatTransportasi: normMap['alattransportasi'] || normMap['transportasi'] || 'Jalan Kaki',
      nomorHP: normMap['nomorhp'] || normMap['nohp'] || tlpWali || '081234567890',
      email: normMap['email'] || `${cleanNisn}@siswa.ktct.sch.id`,

      // 3. Riwayat Pendidikan
      asalSekolah: normMap['asalsekolah'] || normMap['sekolahasal'] || 'SD Negeri Tambora',
      skhun: normMap['skhun'] || normMap['noijazah'] || `DN-01/D-SD/13/${cleanNisn.slice(-6)}`,
      penerimaKPS: normMap['penerimakps'] || normMap['kps'] || 'Tidak',

      // 4. Data Keluarga
      nomorKartuKeluarga: normMap['nomorkartukeluarga'] || normMap['nokk'] || normMap['kk'] || '3173010101100001',
      statusYatim: (detectedStatusYatim as any) || 'Lengkap',
      // Ayah
      namaAyah: normMap['namaayah'] || normMap['ayah'] || (isStatusWord ? '-' : namaWali) || '-',
      nikAyah: normMap['nikayah'] || '3173010101700001',
      tempatLahirAyah: normMap['tempatlahirayah'] || 'Jakarta',
      tanggalLahirAyah: normMap['tanggallahirayah'] || '1975-05-10',
      pendidikanAyah: normMap['pendidikanayah'] || 'SMA/Sederajat',
      pekerjaanAyah: normMap['pekerjaanayah'] || 'Karyawan Swasta',
      penghasilanAyah: normMap['penghasilanayah'] || 'Rp 3.000.000 - Rp 5.000.000',
      tlpAyah: normMap['tlpayah'] || normMap['nohpayah'] || tlpWali || '-',
      statusAyah: (normMap['statusayah'] as any) || 'Masih Hidup',
      // Ibu
      namaIbu: normMap['namaibu'] || normMap['ibu'] || 'Ibu',
      nikIbu: normMap['nikibu'] || '3173010101800002',
      tempatLahirIbu: normMap['tempatlahiribu'] || 'Jakarta',
      tanggalLahirIbu: normMap['tanggallahiribu'] || '1980-08-15',
      pendidikanIbu: normMap['pendidikanibu'] || 'SMA/Sederajat',
      pekerjaanIbu: normMap['pekerjaanibu'] || 'Ibu Rumah Tangga',
      penghasilanIbu: normMap['penghasilanibu'] || '< Rp 1.000.000',
      tlpIbu: normMap['tlpibu'] || normMap['nohpibu'] || '-',
      statusIbu: (normMap['statusibu'] as any) || 'Masih Hidup',
      // Wali
      namaWali: namaWali || '-',
      tempatLahirWali: normMap['tempatlahirwali'] || '-',
      tglLahirWali: normMap['tgllahirwali'] || normMap['tanggallahirwali'] || '-',
      pendidikanWali: normMap['pendidikanwali'] || '-',
      pekerjaanWali: normMap['pekerjaanwali'] || '-',
      penghasilanWali: normMap['penghasilanwali'] || '-',
      hubungan: normMap['hubunganwali'] || normMap['hubungan'] || 'Orang Tua Kandung',
      tlpWali: tlpWali || '-',

      // 5. Berkas
      aktaKelahiran: (normMap['aktakelahiran'] || normMap['akta'] as any) || 'Ada',
      kartuKeluarga: (normMap['kartukeluarga'] || normMap['kkdokumen'] as any) || 'Ada',
      kia: (normMap['kia'] as any) || 'Ada',
      ktpAyah: (normMap['ktpayah'] as any) || 'Ada',
      ktpIbu: (normMap['ktpibu'] as any) || 'Ada',
      ijazah: (normMap['ijazah'] as any) || 'Ada',
      ktpWali: (normMap['ktpwali'] as any) || 'Tidak Ada',
      rapor: (normMap['rapor'] as any) || 'Ada',
      sPindah: (normMap['spindah'] as any) || 'Tidak Perlu',
      suKet: (normMap['suket'] as any) || 'Ada',
      sDomisili: (normMap['sdomisili'] as any) || 'Ada',
    };

    return student;
  },

  // Parse Excel ArrayBuffer (works for .xlsx and .xls)
  parseExcelBuffer(buffer: ArrayBuffer): ImportParseResult {
    const result: ImportParseResult = {
      success: false,
      students: [],
      totalRows: 0,
      validCount: 0,
      ignoredCount: 0,
      detectedHeaders: [],
      is70ColumnsFormat: false,
      errors: [],
      warnings: [],
    };

    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        result.errors.push('File Excel kosong atau tidak memiliki lembar kerja (worksheet).');
        return result;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!jsonData || jsonData.length === 0) {
        result.errors.push('Lembar kerja Excel tidak berisi data siswa.');
        return result;
      }

      const headers = Object.keys(jsonData[0] || {});
      result.detectedHeaders = headers;
      result.is70ColumnsFormat = headers.length >= 30;
      result.totalRows = jsonData.length;

      jsonData.forEach((row, idx) => {
        const std = this.mapRowToStudent(row, idx);
        if (std) {
          result.students.push(std);
        } else {
          result.ignoredCount++;
          result.warnings.push(`Baris ${idx + 2} diabaikan (NISN atau Nama kosong).`);
        }
      });

      result.validCount = result.students.length;
      result.success = result.validCount > 0;
      if (!result.success && result.errors.length === 0) {
        result.errors.push('Tidak ada baris data siswa yang valid dengan NISN dan Nama.');
      }
    } catch (err: any) {
      result.errors.push(`Gagal membaca berkas Excel: ${err?.message || 'Format tidak valid'}`);
    }

    return result;
  },

  // Parse CSV, TSV, or raw delimited text
  parseText(rawText: string): ImportParseResult {
    const result: ImportParseResult = {
      success: false,
      students: [],
      totalRows: 0,
      validCount: 0,
      ignoredCount: 0,
      detectedHeaders: [],
      is70ColumnsFormat: false,
      errors: [],
      warnings: [],
    };

    const trimmed = rawText.trim();
    if (!trimmed) {
      result.errors.push('Teks input data siswa masih kosong.');
      return result;
    }

    // Try parsing via XLSX csv reader for maximum RFC4180 compatibility
    try {
      const workbook = XLSX.read(trimmed, { type: 'string' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        // Check if headers contain nisn or nama
        const hasNisnHeader = headers.some((h) => this.normalizeKey(h).includes('nisn'));
        const hasNamaHeader = headers.some((h) => this.normalizeKey(h).includes('nama'));

        if (hasNisnHeader && hasNamaHeader) {
          result.detectedHeaders = headers;
          result.is70ColumnsFormat = headers.length >= 30;
          result.totalRows = rows.length;

          rows.forEach((r, idx) => {
            const std = this.mapRowToStudent(r, idx);
            if (std) {
              result.students.push(std);
            } else {
              result.ignoredCount++;
            }
          });

          result.validCount = result.students.length;
          result.success = result.validCount > 0;
          if (result.success) {
            return result;
          }
        }
      }
    } catch {
      // Fall through to manual lines splitter
    }

    // Fallback: Split by newline
    const lines = trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      result.errors.push('Tidak ada baris teks yang ditemukan.');
      return result;
    }

    // Detect if first line is a header
    let headerParts: string[] = [];
    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();

    // Try detecting delimiter (comma, semicolon, or tab)
    const detectDelimiter = (line: string): string => {
      const tabCount = (line.match(/\t/g) || []).length;
      const semiCount = (line.match(/;/g) || []).length;
      const commaCount = (line.match(/,/g) || []).length;
      if (tabCount > semiCount && tabCount > commaCount) return '\t';
      if (semiCount > commaCount) return ';';
      return ',';
    };

    const delimiter = detectDelimiter(lines[0]);

    if (firstLineLower.includes('nisn') || firstLineLower.includes('nama')) {
      headerParts = lines[0].split(delimiter).map((p) => p.trim().replace(/^['"]|['"]$/g, ''));
      result.detectedHeaders = headerParts;
      result.is70ColumnsFormat = headerParts.length >= 30;
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(delimiter).map((p) => p.trim().replace(/^['"]|['"]$/g, ''));

      if (headerParts.length > 0) {
        // Construct row object with header keys
        const rowObj: Record<string, string> = {};
        headerParts.forEach((h, hIdx) => {
          rowObj[h] = parts[hIdx] || '';
        });

        const std = this.mapRowToStudent(rowObj, i);
        if (std) {
          result.students.push(std);
        } else {
          result.ignoredCount++;
        }
      } else {
        // Positional fallback: 0: NISN, 1: Nama, 2: Jenjang, 3: Kelas, 4: Wali, 5: Telp
        if (parts.length >= 2) {
          const nisn = parts[0].replace(/[^0-9]/g, '');
          const nama = parts[1];
          const rawJenjang = parts[2] || '';
          const rawKelas = parts[3] || '9';
          const wali = parts[4] || '-';
          const telp = parts[5] || '-';

          if (nisn && nama) {
            const jenjang = this.determineJenjang(rawJenjang, rawKelas);
            const defaultFoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
            result.students.push({
              id: 'STD-' + nisn,
              nisn,
              nama,
              namaLengkap: nama,
              jenjang,
              kelas: rawKelas,
              kelasSaatini: rawKelas,
              rombel: 'Rombel KTCT Tambora',
              status: 'AKTIF',
              linkFoto: defaultFoto,
              pasFoto: defaultFoto,
              waliMurid: wali,
              teleponWali: telp,
              nopdkt: `KTCT-2025-${nisn.slice(-4) || '0001'}`,
              tahunMasuk: '2025',
              jenisKelamin: 'L',
              tempatLahir: 'Jakarta',
              tanggalLahir: '2010-01-01',
              nik: `317301${nisn}`,
              anakKe: 1,
              saudara: 2,
              agama: 'Islam',
              golonganDarah: 'O',
              tinggiBadan: 155,
              beratBadan: 48,
              prestasi: '-',
              hobi: '-',
              catatanPenting: '-',
              alamat: 'Jl. Tambora Raya',
              rt: '005',
              rw: '03',
              kelurahan: 'Tambora',
              kecamatan: 'Tambora',
              kota: 'Jakarta Barat',
              provinsi: 'DKI Jakarta',
              kodePos: '11220',
              jenisTinggal: 'Bersama Orang Tua',
              alatTransportasi: 'Jalan Kaki',
              nomorHP: telp || '081234567890',
              email: `${nisn}@siswa.ktct.sch.id`,
              asalSekolah: 'SD Negeri Tambora',
              skhun: `DN-01/D-SD/13/${nisn.slice(-6)}`,
              penerimaKPS: 'Tidak',
              nomorKartuKeluarga: '3173010101100001',
              statusYatim: 'Lengkap',
              namaAyah: wali || 'Ayah',
              nikAyah: '3173010101700001',
              tempatLahirAyah: 'Jakarta',
              tanggalLahirAyah: '1975-05-10',
              pendidikanAyah: 'SMA/Sederajat',
              pekerjaanAyah: 'Karyawan Swasta',
              penghasilanAyah: 'Rp 3.000.000 - Rp 5.000.000',
              tlpAyah: telp || '-',
              statusAyah: 'Masih Hidup',
              namaIbu: 'Ibu',
              nikIbu: '3173010101800002',
              tempatLahirIbu: 'Jakarta',
              tanggalLahirIbu: '1980-08-15',
              pendidikanIbu: 'SMA/Sederajat',
              pekerjaanIbu: 'Ibu Rumah Tangga',
              penghasilanIbu: '< Rp 1.000.000',
              tlpIbu: '-',
              statusIbu: 'Masih Hidup',
              namaWali: wali || '-',
              tempatLahirWali: '-',
              tglLahirWali: '-',
              pendidikanWali: '-',
              pekerjaanWali: '-',
              penghasilanWali: '-',
              hubungan: 'Orang Tua Kandung',
              tlpWali: telp || '-',
              aktaKelahiran: 'Ada',
              kartuKeluarga: 'Ada',
              kia: 'Ada',
              ktpAyah: 'Ada',
              ktpIbu: 'Ada',
              ijazah: 'Ada',
              ktpWali: 'Tidak Ada',
              rapor: 'Ada',
              sPindah: 'Tidak Perlu',
              suKet: 'Ada',
              sDomisili: 'Ada',
            });
          } else {
            result.ignoredCount++;
          }
        }
      }
    }

    result.totalRows = lines.length - startIndex;
    result.validCount = result.students.length;
    result.success = result.validCount > 0;

    if (!result.success) {
      result.errors.push(
        'Format teks tidak terbaca. Pastikan terdapat kolom NISN dan Nama Lengkap, atau gunakan tombol Unduh Template.'
      );
    }

    return result;
  },
};
