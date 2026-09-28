import type { KeuanganTagihan, KeuanganInvoice, KeuanganTabungan, KeuanganBiaya, KeuanganKas } from '../data/keuanganSeed';

// Helper to clean raw numeric strings
export function parseNumeric(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;
  // Remove "Rp", "IDR", spaces
  str = str.replace(/^(?:Rp|IDR)\.?\s*/i, '').trim();

  // If format is like 2.700.000,00 (Indonesian format with comma decimal)
  if (str.includes('.') && str.includes(',')) {
    // 2.700.000,50 -> remove dots, replace comma with dot
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes('.')) {
    // Count occurrences of '.'
    const dotParts = str.split('.');
    if (dotParts.length > 2) {
      // E.g. 2.700.000 -> thousand separators
      str = str.replace(/\./g, '');
    } else if (dotParts.length === 2) {
      // E.g. 180.000 or 232.500 -> if the part after dot is 3 digits, in Indonesian rupiah it is a thousand separator
      if (dotParts[1].length === 3) {
        str = str.replace(/\./g, '');
      }
    }
  } else if (str.includes(',')) {
    // E.g. 180,000 (US) or 180,50 (ID decimal)
    const commaParts = str.split(',');
    if (commaParts.length > 2 || (commaParts.length === 2 && commaParts[1].length === 3)) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  }

  const cleaned = str.replace(/[^0-9.-]+/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

// Helper to safely parse dates from Excel (serial numbers, Date objects, strings)
export function parseDateString(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    // Excel serial number (days since 1899-12-30)
    if (val > 20000 && val < 70000) {
      const utc_days = Math.floor(val - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      if (!isNaN(date_info.getTime())) {
        const y = date_info.getUTCFullYear();
        const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date_info.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    return String(val);
  }
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return '';

  // Case: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Case: YYYY-MM-DD or starts with YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Case: Date parseable
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && str.length >= 8) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return str;
}

// Helper to filter out template guide instructions / spreadsheet header hints
export function cleanKeterangan(raw?: any): string {
  if (!raw || raw === '-') return '';
  const normalized = String(raw).replace(/\u00a0/g, ' ').trim();
  if (!normalized || normalized === '-') return '';
  const lower = normalized.toLowerCase();

  // Filter out any template header tooltips or guide instructions that leaked from the spreadsheet
  const templateKeywords = [
    'kode unik tagihan',
    'otomatis dibuatkan jika kosong',
    'nis atau id siswa',
    'nama lengkap siswa',
    'kelas siswa saat tagihan',
    'kode tarif dari',
    'nama pos biaya',
    'tahun ajaran saat tagihan',
    'semester ganjil / genap',
    'tanggal terbit tagihan',
    'batas pembayaran',
    'nominal asli pos biaya',
    'potongan biaya',
    'nominal bersih',
    'jumlah yang sudah dibayar',
    'sisa tunggakan',
    'status tagihan',
    'catatan kasir / keterangan tambahan'
  ];

  for (const kw of templateKeywords) {
    if (lower.includes(kw)) {
      return '';
    }
  }

  return normalized;
}

const studentMapCache = new WeakMap<any[], Map<string, any>>();

function addKeyVariations(map: Map<string, any>, rawKey: any, student: any) {
  if (!rawKey) return;
  const str = String(rawKey).trim();
  if (!str || str === '-' || str === 'undefined' || str === 'null') return;
  map.set(str, student);
  map.set(str.toLowerCase(), student);
  if (/^\d+$/.test(str)) {
    map.set(str.padStart(3, '0'), student);
    map.set(String(Number(str)), student);
  }
}

export function getStudentLookupMap(studentsList?: any[]): Map<string, any> | null {
  if (!studentsList || studentsList.length === 0) return null;
  if (studentMapCache.has(studentsList)) {
    return studentMapCache.get(studentsList)!;
  }
  const map = new Map<string, any>();
  for (let i = 0; i < studentsList.length; i++) {
    const s = studentsList[i];
    if (!s) continue;
    addKeyVariations(map, s.id, s);
    addKeyVariations(map, s.nis, s);
    addKeyVariations(map, s.nisn, s);
    addKeyVariations(map, s.nopdkt || s.NoPDKT || s.NoPdkt || s.noPdkt, s);
    addKeyVariations(map, s.registrationCode, s);
    addKeyVariations(map, s.no_pendaftaran, s);
    if (s.name) map.set(String(s.name).trim().toLowerCase(), s);
  }
  studentMapCache.set(studentsList, map);
  return map;
}

// Helper to extract student nopdkt from structured IDs like TAG_005_20250701_001 or BAY_005_... or TAB_005_...
function extractStudentIdFromStructuredId(rawId: string): string {
  if (!rawId) return '';
  const match = String(rawId).trim().match(/^(?:TAG|TGH|BAY|BYR|INV|TAB|TAR)_([A-Za-z0-9]+)_/i);
  return match ? match[1] : '';
}

// Deterministic Natural Key for Tagihan to prevent multiplication and duplicate bloating
export function getTagihanNaturalKey(item: any, idx?: number): string {
  if (!item) return '';
  if (item._naturalKey) return item._naturalKey;
  const explicitId = String(item.TagihanID || item.tagihanId || item.id || '').trim();
  if (explicitId && explicitId.startsWith('TGH_NAT_')) {
    return explicitId;
  }
  const bId = String(item.biayaId || item.KodeBiaya || item.kodeBiaya || item.namaBiaya || item.NamaBiaya || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const sem = String(item.semester || item.Semester || item.semesterId || item.SemesterID || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (explicitId && !explicitId.startsWith('remote_')) {
    return bId || sem ? `${explicitId}__${bId}_${sem}` : explicitId;
  }
  if (item.No !== undefined && item.No !== null && String(item.No).trim() !== '' && String(item.No).trim() !== '-') {
    return `TGH_ROW_${String(item.No).trim()}`;
  }
  const sId = String(item.siswaId || item.SiswaID || item.NoPDKT || item.nopdkt || item.NoPdkt || item.noPdkt || item.nis || item.NIS || item.namaSiswa || item.NamaSiswa || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const per = String(item.periode || item.Periode || item.tahunAjaranId || item.tahunAjaran || item.TahunAjaran || item.tanggalTagihan || item.TanggalTagihan || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const nom = Number(item.totalTagihan ?? item.TotalTagihan ?? item.nominal ?? item.Nominal ?? 0);

  return `TGH_NAT_${sId}_${bId}_${per}_${sem}_${nom}`;
}

export function deduplicateTagihanList<T = any>(list: T[]): T[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  if ((list as any)._deduped === true) return list;
  const map = new Map<string, T>();
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item) continue;
    const key = getTagihanNaturalKey(item, i);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  const res = Array.from(map.values());
  (res as any)._deduped = true;
  return res;
}

// Normalizer for Sheet TAGIHAN / Excel / TSV
// Header resmi: No | TagihanID | NoPDKT | NamaSiswa | Kelas | KodeBiaya | NamaBiaya | TahunAjaran | Semester | TanggalTagihan | JatuhTempo | Nominal | Diskon | TotalTagihan | TanggalBayar | TotalBayar | SisaTagihan | Status | Keterangan
export function normalizeTagihanRow(item: any, idx: number, studentsList?: any[]): KeuanganTagihan {
  if (item && item._norm === true) {
    if (item.namaSiswa && !String(item.namaSiswa).startsWith('Siswa (')) {
      return item as KeuanganTagihan;
    }
    if (studentsList && studentsList.length > 0) {
      const lookupMap = getStudentLookupMap(studentsList);
      const found = lookupMap?.get(item.siswaId) || lookupMap?.get(item.nopdkt);
      if (found) {
        item.namaSiswa = String(found.name || item.namaSiswa).trim();
        if (!item.kelasNama || item.kelasNama === 'Semua Kelas') {
          item.kelasNama = String(found.class || 'Semua Kelas').trim();
          item.kelasId = item.kelasNama;
        }
      }
    }
    return item as KeuanganTagihan;
  }

  const naturalKey = getTagihanNaturalKey(item, idx);
  const explicitId = String(item.TagihanID || item.tagihanId || item.id || '').trim();
  const id = (explicitId && !explicitId.startsWith('remote_'))
    ? explicitId
    : (item.No ? `TGH_ROW_${item.No}` : (naturalKey || `TGH_ROW_${idx + 1}`));
  const invoiceId = item.InvoiceID || item.invoiceId || '-';

  // Nomor Pendaftaran (nopdkt / NoPDKT) & ID Siswa
  const fallbackIdFromTag = extractStudentIdFromStructuredId(explicitId);
  const nopdkt = String(
    item.NoPDKT || item.nopdkt || item.NoPdkt || item.noPdkt || 
    item.NoPendaftaran || item.no_pendaftaran || item.NoDaftar || 
    fallbackIdFromTag || ''
  ).trim();
  const siswaId = String(
    item.SiswaID || item.siswaId || nopdkt || item.nis || item.NIS || fallbackIdFromTag || ''
  ).trim();
  
  // Find student if name is not given or correlate via O(1) lookupMap
  let namaSiswa = String(item.NamaSiswa || item.namaSiswa || item['Nama Siswa'] || item.nama || '').trim();
  const rawKelas = item.Kelas !== undefined && item.Kelas !== null && item.Kelas !== '' ? item.Kelas : (item.kelas || item.KelasID || item.kelasId || item.Target_Kelas || item.kelasNama || item.targetKelas || '');
  let kelasNama = String(rawKelas || '').trim();
  let nis = String(item.NoPDKT || item.nopdkt || item.NoPdkt || item.NIS || item.nis || item.NISN || item.nisn || nopdkt || '').trim();

  if (studentsList && studentsList.length > 0 && (siswaId || nopdkt || namaSiswa)) {
    const lookupMap = getStudentLookupMap(studentsList);
    if (lookupMap) {
      const found =
        (siswaId && lookupMap.get(siswaId)) ||
        (nopdkt && lookupMap.get(nopdkt)) ||
        (namaSiswa && lookupMap.get(namaSiswa.toLowerCase()));
      if (found) {
        if (!namaSiswa || namaSiswa === 'Siswa') namaSiswa = String(found.name || '').trim();
        if (!kelasNama || kelasNama === 'Semua Kelas') kelasNama = String(found.class || '').trim();
        if (!nis || nis === '-') nis = String(found.nopdkt || found.nis || found.nisn || nopdkt || nis).trim();
      }
    }
  }
  if (!namaSiswa) namaSiswa = `Siswa (${nopdkt || siswaId || idx + 1})`;
  if (!kelasNama) kelasNama = 'Semua Kelas';

  const kodeBiaya = item.KodeBiaya || item.kodeBiaya || item.BiayaID || item.biayaId || '';
  const biayaId = kodeBiaya || item.BiayaID || item.biayaId || '';
  const namaBiaya = item.NamaBiaya || item.namaBiaya || item['Nama Biaya'] || item.posBiaya || 'Iuran Pendidikan';

  const rawTA = String(item.TahunAjaran || item.tahunAjaran || item.TahunAjaranID || item.tahunAjaranId || item.TA || item.ta || '2025/2026').trim();
  const tahunAjaranId = rawTA || '2025/2026';
  const semesterId = String(item.Semester || item.semester || item.SemesterID || item.semesterId || 'Ganjil').trim();

  const tanggalTagihan = parseDateString(item.TanggalTagihan || item.tanggalTagihan || item.Tanggal || item.tanggal || item.TglTagihan) || new Date().toISOString().slice(0, 10);
  const jatuhTempo = parseDateString(item.JatuhTempo || item.jatuhTempo || item.TanggalJatuhTempo || item.tanggalJatuhTempo || item.Tempo) || tanggalTagihan;
  const tanggalBayar = parseDateString(item.TanggalBayar || item.tanggalBayar || item.TglBayar || item.tglBayar || item.PaidAt || item.paidAt) || '';
  const rawKeterangan = String(item.Keterangan || item.keterangan || item.Catatan || item.catatan || '').trim();
  const keterangan = cleanKeterangan(rawKeterangan);

  const nominalAsli = parseNumeric(item.Nominal ?? item.nominal ?? item.NominalAsli ?? item.nominalAsli ?? item.tarif ?? item.Tarif ?? item.Jumlah ?? item.jumlah ?? 0);
  const diskon = parseNumeric(item.Diskon ?? item.diskon ?? item.Potongan ?? item.potongan ?? 0);
  const denda = parseNumeric(item.Denda ?? item.denda ?? 0);
  
  // Total Tagihan: jika ada di kolom Sheet (TotalTagihan / Total Tagihan / Total) gunakan itu, jika kosong hitung Nominal - Diskon + Denda
  let totalTagihan = parseNumeric(
    item.TotalTagihan ?? item.totalTagihan ?? item['Total Tagihan'] ?? 
    item.Total ?? item.total ?? 0
  );
  if (totalTagihan === 0 && (nominalAsli > 0 || diskon > 0 || denda > 0)) {
    totalTagihan = Math.max(0, nominalAsli - diskon + denda);
  }
  
  // Sudah Bayar / Total Bayar: tangkap berbagai variasi nama kolom dari Google Sheets / Excel
  let paidAmount = parseNumeric(
    item.TotalBayar ?? item.totalBayar ?? item['Total Bayar'] ??
    item.SudahBayar ?? item.sudahBayar ?? item['Sudah Bayar'] ??
    item.Dibayar ?? item.dibayar ?? item.Terbayar ?? item.terbayar ??
    item.JumlahBayar ?? item.jumlahBayar ?? item['Jumlah Bayar'] ??
    item.JmlBayar ?? item.jmlBayar ?? item['Jml Bayar'] ??
    item.Bayar ?? item.bayar ??
    item.PaidAmount ?? item.paidAmount ?? 0
  );

  const statusRaw = String(item.Status || item.status || '').toUpperCase();

  // Jika status LUNAS tapi nominal bayar kosong, anggap lunas penuh
  if (statusRaw.includes('LUNAS') && paidAmount === 0 && totalTagihan > 0) {
    paidAmount = totalTagihan;
  }

  // Sisa Tunggakan: Total Tagihan - Sudah Bayar
  let sisaTagihan = parseNumeric(
    item.SisaTagihan ?? item.sisaTagihan ?? item['Sisa Tagihan'] ??
    item.SisaTunggakan ?? item.sisaTunggakan ?? item['Sisa Tunggakan'] ??
    item.Tunggakan ?? item.tunggakan ??
    item.Sisa ?? item.sisa ??
    item.RemainingAmount ?? item.remainingAmount
  );

  if (statusRaw.includes('LUNAS')) {
    sisaTagihan = 0;
  } else if (
    item.SisaTagihan === undefined && 
    item.sisaTagihan === undefined && 
    item['Sisa Tagihan'] === undefined &&
    item.SisaTunggakan === undefined &&
    item['Sisa Tunggakan'] === undefined
  ) {
    sisaTagihan = Math.max(0, (totalTagihan || nominalAsli) - paidAmount);
  } else if (sisaTagihan === 0 && paidAmount === 0 && totalTagihan > 0 && !statusRaw.includes('LUNAS')) {
    sisaTagihan = totalTagihan;
  }
  let status: 'BELUM' | 'SEBAGIAN' | 'LUNAS' = 'BELUM';
  if (statusRaw.includes('LUNAS') || (sisaTagihan === 0 && (paidAmount > 0 || totalTagihan > 0))) {
    status = 'LUNAS';
  } else if (statusRaw.includes('SEBAGIAN') || paidAmount > 0) {
    status = 'SEBAGIAN';
  }

  const petugasId = item.PetugasID || item.petugasId || item.paidBy || item.createdBy || 'Admin / Kasir Keuangan';
  const paidAt = tanggalBayar || (status === 'LUNAS' ? tanggalTagihan : '');
  const paidBy = item.PaidBy || item.paidBy || (status === 'LUNAS' ? petugasId : '');
  const paymentType = item.PaymentType || item.paymentType || (status === 'SEBAGIAN' ? 'CICILAN' : 'FULL');

  const createdAt = parseDateString(item.CreatedAt || item.createdAt) || tanggalTagihan || new Date().toISOString().slice(0, 10);
  const updatedAt = parseDateString(item.UpdatedAt || item.updatedAt) || new Date().toISOString().slice(0, 10);

  const rawPeriode = String(item.Periode || item.periode || '').trim();
  const periode = rawPeriode || (tanggalTagihan ? String(tanggalTagihan).slice(0, 7) : `${tahunAjaranId.slice(0, 4)}-07`);

  return {
    id,
    tagihanId: id,
    invoiceId,
    nopdkt,
    siswaId: siswaId || nopdkt,
    namaSiswa,
    nis,
    kelasId: kelasNama,
    kelasNama,
    kodeBiaya,
    biayaId,
    namaBiaya,
    tahunAjaranId,
    semesterId,
    tanggalTagihan,
    tanggalJatuhTempo: jatuhTempo,
    jatuhTempo,
    tanggalBayar,
    nominal: sisaTagihan,
    nominalAsli: nominalAsli || totalTagihan,
    diskon,
    denda,
    totalTagihan: totalTagihan || nominalAsli,
    totalBayar: paidAmount,
    paidAmount,
    sisaTagihan,
    periode,
    status,
    keterangan,
    petugasId,
    paidAt,
    paidBy,
    paymentType,
    createdAt,
    updatedAt,
    _norm: true,
    _naturalKey: naturalKey,
  } as any;
}

// Deterministic Natural Key for Pembayaran to prevent multiplication and duplicate bloating
export function getPembayaranNaturalKey(item: any, idx?: number): string {
  if (!item) return '';
  if (item._naturalKey) return item._naturalKey;
  const explicitId = String(item.pembayaranId || item.PembayaranID || item.noKwitansi || item.NoBukti || item.id || '').trim();
  if (explicitId && !explicitId.startsWith('remote_') && !explicitId.startsWith('BYR_NAT_')) {
    return explicitId;
  }
  if (item.No !== undefined && item.No !== null && String(item.No).trim() !== '' && String(item.No).trim() !== '-') {
    return `BYR_ROW_${String(item.No).trim()}`;
  }
  const invId = String(item.invoiceId || item.InvoiceID || '').trim();
  if (invId && !invId.startsWith('remote_') && invId !== '-') {
    return `BYR_INV_${invId}`;
  }
  const sId = String(item.siswaId || item.SiswaID || item.NoPDKT || item.nopdkt || item.NoPdkt || item.noPdkt || item.nis || item.NIS || item.namaSiswa || item.NamaSiswa || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const tgl = String(item.tanggal || item.Tanggal || item.tglBayar || item.CreatedAt || item.createdAt || '').slice(0, 10).trim();
  const nom = Number(item.nominal ?? item.Nominal ?? item.total ?? item.Total ?? item.totalBayar ?? 0);
  const tghId = String(item.tagihanId || item.TagihanID || '').trim();

  return `BYR_NAT_${sId}_${tgl}_${nom}${tghId ? `_${tghId}` : ''}`;
}

export function deduplicatePembayaranList<T = any>(list: T[]): T[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  if ((list as any)._deduped === true) return list;
  const map = new Map<string, T>();
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item) continue;
    const key = getPembayaranNaturalKey(item, i);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  const res = Array.from(map.values());
  (res as any)._deduped = true;
  return res;
}

// Normalizer for Sheet PEMBAYARAN / Invoices / TSV
export function normalizePembayaranRow(item: any, idx: number, studentsList?: any[]): KeuanganInvoice {
  if (item && item._norm === true) {
    if (item.namaSiswa && !String(item.namaSiswa).startsWith('Siswa (')) {
      return item as KeuanganInvoice;
    }
    if (studentsList && studentsList.length > 0) {
      const lookupMap = getStudentLookupMap(studentsList);
      const found = lookupMap?.get(item.siswaId);
      if (found) {
        item.namaSiswa = found.name || item.namaSiswa;
        if (!item.namaKelas) {
          item.namaKelas = found.class || '';
          item.kelasId = item.namaKelas;
        }
      }
    }
    return item as KeuanganInvoice;
  }

  const naturalKey = getPembayaranNaturalKey(item, idx);
  const explicitId = String(item.PembayaranID || item.pembayaranId || item.id || '').trim();
  const pembayaranId = (explicitId && !explicitId.startsWith('remote_'))
    ? explicitId
    : (item.No ? `BYR_ROW_${item.No}` : (naturalKey || `BYR_ROW_${idx + 1}`));
  const id = pembayaranId.startsWith('INV_') ? pembayaranId : `INV_${pembayaranId}`;
  const invoiceId = item.InvoiceID || item.invoiceId || `INV-${String(pembayaranId).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || String(idx + 1).padStart(5, '0')}`;
  const tagihanId = item.TagihanID || item.tagihanId || '';
  
  const fallbackIdFromBay = extractStudentIdFromStructuredId(explicitId) || extractStudentIdFromStructuredId(tagihanId);
  const siswaId = String(item.SiswaID || item.siswaId || item.NoPDKT || item.nopdkt || item.NoPdkt || item.noPdkt || fallbackIdFromBay || '').trim();
  let namaSiswa = item.NamaSiswa || item.namaSiswa || item['Nama Siswa'] || item['NAMA SISWA'] || item.nama || '';
  let namaKelas = item.Kelas || item.kelas || item.KelasID || item.kelasId || item.namaKelas || '';

  if (studentsList && studentsList.length > 0 && (siswaId || namaSiswa)) {
    const lookupMap = getStudentLookupMap(studentsList);
    const found = lookupMap ? (lookupMap.get(siswaId) || lookupMap.get(String(item.nis || item.NIS || '').trim()) || (namaSiswa ? lookupMap.get(String(namaSiswa).toLowerCase()) : null)) : null;
    if (found) {
      if (!namaSiswa || namaSiswa === 'Siswa') namaSiswa = found.name;
      if (!namaKelas) namaKelas = found.class || namaKelas;
    }
  }
  if (!namaSiswa) namaSiswa = `Siswa (${siswaId || idx + 1})`;

  const tanggal = parseDateString(item.Tanggal || item.tanggal || item.TglBayar || item.tglBayar || item.CreatedAt || item.createdAt) || new Date().toISOString().slice(0, 10);
  const nominal = parseNumeric(item.Nominal ?? item.nominal ?? item.Jumlah ?? item.jumlah ?? item.Total ?? item.total ?? 0);
  
  const metode = (item.MetodePembayaran || item.metodePembayaran || item.Metode || item.metode || 'CASH').toString().toUpperCase();
  const bank = item.Bank || item.bank || '-';
  const noReferensi = item.NoReferensi || item.noReferensi || item.noRef || '-';
  const petugasId = item.PetugasID || item.petugasId || item.CreatedBy || item.createdBy || 'Admin / Kasir Keuangan';
  const catatan = item.Catatan || item.catatan || item.Keterangan || item.keterangan || 'Pembayaran Biaya Pendidikan';
  const status = (item.Status || item.status || 'PAID').toString().toUpperCase();

  let tagihanIds: string[] = [];
  if (item.TagihanIDs || item.tagihanIds) {
    const rawIds = item.TagihanIDs || item.tagihanIds;
    if (Array.isArray(rawIds)) tagihanIds = rawIds;
    else if (typeof rawIds === 'string') {
      try {
        tagihanIds = JSON.parse(rawIds);
      } catch {
        tagihanIds = rawIds.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }
  if (tagihanIds.length === 0 && tagihanId) {
    tagihanIds = [tagihanId];
  }

  const rawTA = String(item.TahunAjaran || item.tahunAjaran || item.TahunAjaranID || item.tahunAjaranId || item.TA || item.ta || '').trim();
  const rawSem = String(item.Semester || item.semester || item.SemesterID || item.semesterId || '').trim();

  const createdAt = parseDateString(item.CreatedAt || item.createdAt) || tanggal;
  const updatedAt = parseDateString(item.UpdatedAt || item.updatedAt) || new Date().toISOString().slice(0, 10);

  return {
    id,
    pembayaranId,
    tagihanId,
    invoiceId,
    siswaId,
    namaSiswa,
    kelasId: namaKelas,
    namaKelas,
    tanggal,
    tglBayar: tanggal,
    nominal,
    total: nominal,
    metodePembayaran: metode,
    metode,
    noReferensi,
    bank,
    petugasId,
    createdBy: petugasId,
    keterangan: catatan,
    catatan,
    status,
    tagihanIds,
    tahunAjaranId: rawTA || undefined,
    semesterId: rawSem || undefined,
    items: [{
      namaBiaya: catatan,
      periode: String(tanggal).slice(0, 7),
      nominal
    }],
    createdAt,
    updatedAt,
    _norm: true,
    _naturalKey: naturalKey,
  } as any;
}

/**
 * Natural Transaction Key generator for Sheet TABUNGAN
 * Ensures duplicate transactions (even if array is merged, raw from sheet, or saved in older ID formats)
 * resolve to the exact same canonical deterministic key.
 */
export function getTabunganNaturalKey(item: any): string {
  if (!item) return '';
  if (item._naturalKey) return item._naturalKey;

  const explicitId = String(item.TabunganID || item.tabunganId || item.id || item.NoTransaksi || '').trim();

  // 1. Official Google Spreadsheet TabunganID format: TAB_xxx_yyyy-mm-dd_zzz or TAR_xxx_yyyy-mm-dd_zzz
  const matchOfficial = explicitId.match(/^(TAB|TAR)_([A-Za-z0-9]+)_(\d{4}-\d{2}-\d{2})_(\d+)$/i);
  if (matchOfficial) {
    const type = matchOfficial[1].toUpperCase() === 'TAR' ? 'TARIK' : 'SETOR';
    const sId = matchOfficial[2].toLowerCase();
    const tgl = matchOfficial[3];
    const counter = matchOfficial[4];
    return `TAB_SIG_${sId}_${tgl}_${type}_${counter}`;
  }

  // 2. Previously generated TAB_NAT_ format: TAB_NAT_xxx_yyyy-mm-dd_SETOR/TARIK_nominal_counter
  const matchNat = explicitId.match(/^TAB_NAT_([A-Za-z0-9]+)_(\d{4}-\d{2}-\d{2})_(SETOR|TARIK)(?:_\d+)?(?:_(\d+))?$/i);
  if (matchNat) {
    const sId = matchNat[1].toLowerCase();
    const tgl = matchNat[2];
    const type = matchNat[3].toUpperCase();
    const counter = matchNat[4] || '001';
    return `TAB_SIG_${sId}_${tgl}_${type}_${counter}`;
  }

  // 3. Fallback from item properties (student ID/name + date + type + counter)
  const sId = String(item.siswaId || item.SiswaID || item.NoPDKT || item.nopdkt || item.NoPdkt || item.noPdkt || item.nis || item.NIS || item.namaSiswa || item.NamaSiswa || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const tgl = String(item.tanggal || item.Tanggal || item.createdAt || item.CreatedAt || '').slice(0, 10).trim();
  const jns = String(item.jenis || item.jenisTransaksi || item.JenisTransaksi || item.Jenis || '').toUpperCase().trim().includes('TARIK') ? 'TARIK' : 'SETOR';

  const counterMatch = explicitId.match(/_(\d{3,})$/);
  const counter = counterMatch ? counterMatch[1] : '001';

  return `TAB_SIG_${sId}_${tgl}_${jns}_${counter}`;
}

/**
 * Deduplicate tabungan records completely to prevent duplicate and bloated counting
 */
export function deduplicateTabunganList<T = any>(list: T[]): T[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  if ((list as any)._deduped === true) return list;
  const map = new Map<string, T>();
  for (const item of list) {
    if (!item) continue;
    const key = getTabunganNaturalKey(item);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      // Prioritize the record that has official TabunganID or structured row numbers
      const existing: any = map.get(key);
      const isIncomingOfficial = (item as any).TabunganID && /^(?:TAB|TAR)_/i.test((item as any).TabunganID);
      const isExistingOfficial = existing?.TabunganID && /^(?:TAB|TAR)_/i.test(existing.TabunganID);
      if (isIncomingOfficial && !isExistingOfficial) {
        map.set(key, item);
      } else if (isIncomingOfficial && isExistingOfficial) {
        if ((item as any).no && !(existing as any).no) {
          map.set(key, item);
        }
      }
    }
  }
  const res = Array.from(map.values());
  (res as any)._deduped = true;
  return res;
}

// Normalizer for Sheet TABUNGAN / Excel / TSV
// Header resmi: id | siswaId | tanggal | jenis | nominal | catatan | createdBy | createdAt
// Variasi fleksibel: No | TabunganID | SiswaID | nopdkt | NIS | NamaSiswa | Kelas | Tanggal | JenisTransaksi | Debit | Kredit | Nominal | Saldo | Catatan | PetugasID
export function normalizeTabunganRow(item: any, idx: number, studentsList?: any[]): KeuanganTabungan {
  if (item && item._norm === true) {
    if (item.namaSiswa && !String(item.namaSiswa).startsWith('Siswa (')) {
      return item as KeuanganTabungan;
    }
    if (studentsList && studentsList.length > 0) {
      const lookupMap = getStudentLookupMap(studentsList);
      const found = lookupMap?.get(item.siswaId);
      if (found) {
        item.namaSiswa = String(found.name || item.namaSiswa).trim();
        if (!item.studentClass || item.studentClass === 'Semua Kelas') {
          item.studentClass = String(found.class || 'Semua Kelas').trim();
          item.kelasNama = item.studentClass;
        }
      }
    }
    return item as KeuanganTabungan;
  }

  const explicitId = String(item.TabunganID || item.tabunganId || item.id || item.NoTransaksi || '').trim();
  const naturalKey = getTabunganNaturalKey(item);
  const rawNo = (item.no !== undefined && item.no !== null && String(item.no).trim() !== '' && String(item.no).trim() !== '-')
    ? Number(String(item.no).replace(/\D/g, ''))
    : (item.No !== undefined && item.No !== null && String(item.No).trim() !== '' && String(item.No).trim() !== '-')
    ? Number(String(item.No).replace(/\D/g, ''))
    : undefined;

  const id = (explicitId && !/^TAB_\d+$/.test(explicitId) && !explicitId.startsWith('remote_') && !explicitId.startsWith('tab_'))
    ? explicitId
    : (rawNo ? `TAB_${rawNo}` : naturalKey || `TAB_${idx + 1}`);

  const fallbackIdFromTab = extractStudentIdFromStructuredId(explicitId);
  const nopdkt = String(item.NoPDKT || item.nopdkt || item.NoPdkt || item.noPdkt || item.NoPendaftaran || item.no_pendaftaran || item.NoDaftar || fallbackIdFromTab || '').trim();
  const siswaId = String(item.SiswaID || item.siswaId || nopdkt || item.nis || item.NIS || item.NISN || item.nisn || fallbackIdFromTab || '').trim();
  
  let namaSiswa = String(item.NamaSiswa || item.namaSiswa || item['Nama Siswa'] || item.nama || item.name || '').trim();
  const rawKelas = item.StudentClass !== undefined && item.StudentClass !== null && item.StudentClass !== '' 
    ? item.StudentClass 
    : (item.studentClass || item.Kelas || item.kelas || item.KelasID || item.kelasId || item.kelasNama || '');
  let studentClass = String(rawKelas || '').trim();

  if (studentsList && studentsList.length > 0 && (siswaId || nopdkt || namaSiswa)) {
    const lookupMap = getStudentLookupMap(studentsList);
    if (lookupMap) {
      const found =
        (siswaId && lookupMap.get(siswaId)) ||
        (nopdkt && lookupMap.get(nopdkt)) ||
        (namaSiswa && lookupMap.get(namaSiswa.toLowerCase()));
      if (found) {
        if (!namaSiswa || namaSiswa === 'Siswa') namaSiswa = String(found.name || '').trim();
        if (!studentClass) studentClass = String(found.class || '').trim();
      }
    }
  }
  if (!namaSiswa) namaSiswa = `Siswa (${nopdkt || siswaId || idx + 1})`;
  if (!studentClass) studentClass = 'Semua Kelas';

  const tanggal = parseDateString(item.Tanggal || item.tanggal || item.CreatedAt || item.createdAt || item.Tgl) || new Date().toISOString().slice(0, 10);
  
  // Analisis nilai Debit & Kredit secara numerik
  const rawDebit = parseNumeric(item.Debit ?? item.debit ?? item.Masuk ?? item.masuk ?? item.Setor ?? item.setor ?? item.Pemasukan ?? item.pemasukan ?? 0);
  const rawKredit = parseNumeric(item.Kredit ?? item.kredit ?? item.Keluar ?? item.keluar ?? item.Tarik ?? item.tarik ?? item.Pengeluaran ?? item.pengeluaran ?? 0);

  // Analisis jenis transaksi dari teks kolom
  const rawJenis = String(item.JenisTransaksi || item.jenisTransaksi || item.Jenis || item.jenis || item.Tipe || item.tipe || item.Type || item.type || '').toUpperCase().trim();
  const rawCatatan = String(item.Catatan || item.catatan || item.Keterangan || item.keterangan || item.Deskripsi || item.deskripsi || '').toLowerCase().trim();

  // Penentuan jenis transaksi secara hierarkis (prioritas kolom Jenis & prefiks ID terlebih dahulu)
  let jenis: 'SETOR' | 'TARIK' = 'SETOR';
  if (
    rawJenis.includes('SETOR') || 
    rawJenis.includes('SETORAN') || 
    rawJenis.includes('MASUK') || 
    rawJenis.includes('DEPOSIT') || 
    rawJenis.includes('SIMPAN') || 
    rawJenis.includes('DEBIT') || 
    rawJenis === 'DB'
  ) {
    jenis = 'SETOR';
  } else if (
    rawJenis.includes('TARIK') || 
    rawJenis.includes('PENARIKAN') || 
    rawJenis.includes('KELUAR') || 
    rawJenis.includes('AMBIL') || 
    rawJenis.includes('KREDIT') || 
    rawJenis.includes('WITHDRAW') || 
    rawJenis === 'CR'
  ) {
    jenis = 'TARIK';
  } else if (explicitId.toUpperCase().startsWith('TAR_')) {
    // Prefiks ID penarikan resmi dari Google Spreadsheet
    jenis = 'TARIK';
  } else if (explicitId.toUpperCase().startsWith('TAB_')) {
    // Prefiks ID setoran resmi dari Google Spreadsheet
    jenis = 'SETOR';
  } else if (rawKredit > 0 && rawDebit === 0) {
    jenis = 'TARIK';
  } else if (rawDebit > 0 && rawKredit === 0) {
    jenis = 'SETOR';
  } else {
    // Fallback deteksi catatan HANYA jika rawJenis, prefiks ID, dan Debit/Kredit kosong/ambigu
    const isExpenseNote = 
      rawCatatan.includes('tarik') || 
      rawCatatan.includes('ambil') || 
      rawCatatan.includes('penarikan') || 
      rawCatatan.includes('keluar') ||
      rawCatatan.includes('potong') ||
      rawCatatan.includes('pengembalian') ||
      rawCatatan.includes('untuk keperluan');
    jenis = isExpenseNote ? 'TARIK' : 'SETOR';
  }

  // Hitung nominal riil mutasi
  let nominal = 0;
  if (jenis === 'TARIK') {
    nominal = rawKredit > 0 ? rawKredit : (rawDebit > 0 ? rawDebit : parseNumeric(item.Nominal ?? item.nominal ?? item.Jumlah ?? item.jumlah ?? item.Total ?? item.total ?? 0));
  } else {
    nominal = rawDebit > 0 ? rawDebit : (rawKredit > 0 ? rawKredit : parseNumeric(item.Nominal ?? item.nominal ?? item.Jumlah ?? item.jumlah ?? item.Total ?? item.total ?? 0));
  }

  const debit = jenis === 'SETOR' ? nominal : 0;
  const kredit = jenis === 'TARIK' ? nominal : 0;
  const saldo = parseNumeric(item.Saldo ?? item.saldo ?? item.SaldoAkhir ?? item.saldoAkhir ?? 0);

  const petugasId = item.PetugasID || item.petugasId || item.CreatedBy || item.createdBy || item.Petugas || item.petugas || 'Bendahara Tabungan';
  const catatan = String(item.Catatan || item.catatan || item.Keterangan || item.keterangan || (jenis === 'SETOR' ? 'Setoran Tabungan Siswa' : 'Penarikan Tabungan Siswa')).trim();
  const status = String(item.Status || item.status || 'SUKSES').toUpperCase();

  const createdAt = parseDateString(item.CreatedAt || item.createdAt) || tanggal;
  const updatedAt = parseDateString(item.UpdatedAt || item.updatedAt) || new Date().toISOString().slice(0, 10);

  return {
    id,
    no: rawNo,
    No: rawNo,
    tabunganId: id,
    TabunganID: id,
    siswaId,
    namaSiswa,
    studentClass,
    kelasNama: studentClass,
    tanggal,
    jenisTransaksi: jenis,
    jenis,
    debit,
    kredit,
    nominal,
    saldo,
    petugasId,
    catatan,
    keterangan: catatan,
    status,
    createdBy: petugasId,
    createdAt,
    updatedAt,
    _norm: true,
    _naturalKey: naturalKey,
  } as any;
}

// Formatter to serialize KeuanganTagihan into Google Sheets TAGIHAN headers
export function formatTagihanForSheet(t: KeuanganTagihan, idx: number) {
  const nominal = Number(t.nominalAsli || t.nominal || 0);
  const diskon = Number(t.diskon || 0);
  const denda = Number(t.denda || 0);
  const totalTagihan = Number(t.totalTagihan || (nominal - diskon + denda));
  const totalBayar = Number(t.totalBayar ?? t.paidAmount ?? 0);
  const sisa = Math.max(0, Number(t.sisaTagihan ?? (totalTagihan - totalBayar)));

  const anyT = t as any;
  const nopdktVal = t.nopdkt || t.nis || t.siswaId || '';
  const tglTagihan = t.tanggalTagihan || t.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return {
    TagihanID: t.tagihanId || t.id || generateStructuredTagihanId(tglTagihan, nopdktVal, []),
    nopdkt: nopdktVal,
    NamaSiswa: t.namaSiswa || '',
    Kelas: t.kelasNama || t.kelasId || '',
    KodeBiaya: t.kodeBiaya || t.biayaId || '',
    NamaBiaya: t.namaBiaya || '',
    TahunAjaran: t.tahunAjaranId || anyT.tahunAjaran || '2025/2026',
    Semester: t.semesterId || anyT.semester || 'Ganjil',
    TanggalTagihan: tglTagihan,
    JatuhTempo: t.tanggalJatuhTempo || t.jatuhTempo || t.tanggalTagihan || '',
    Nominal: nominal,
    Diskon: diskon,
    TotalTagihan: totalTagihan,
    TanggalBayar: t.paidAt || t.tanggalBayar || '',
    TotalBayar: totalBayar,
    SisaTagihan: sisa,
    Status: t.status || (sisa === 0 ? 'LUNAS' : (totalBayar > 0 ? 'SEBAGIAN' : 'BELUM_BAYAR')),
    Keterangan: cleanKeterangan(t.keterangan || anyT.catatan || '')
  };
}

// Formatter to serialize KeuanganInvoice into Google Sheets PEMBAYARAN headers
export function formatPembayaranForSheet(p: KeuanganInvoice, idx: number) {
  const tglBayar = p.tanggal || p.tglBayar || new Date().toISOString().slice(0, 10);
  const sId = p.siswaId || '';
  return {
    PembayaranID: p.pembayaranId || p.id || generateStructuredPembayaranId(tglBayar, sId, []),
    TagihanID: p.tagihanId || (p.tagihanIds && p.tagihanIds[0]) || '',
    InvoiceID: p.invoiceId || generateStructuredInvoiceId(tglBayar, sId, []),
    SiswaID: sId,
    NamaSiswa: p.namaSiswa || '',
    Kelas: p.namaKelas || p.kelasId || '',
    Tanggal: tglBayar,
    MetodePembayaran: p.metodePembayaran || p.metode || 'CASH',
    Nominal: Number(p.nominal || p.total || 0),
    Status: p.status || 'PAID',
    Catatan: p.catatan || p.keterangan || ''
  };
}

// Formatter to serialize KeuanganTabungan into Google Sheets TABUNGAN headers
export function formatTabunganForSheet(t: KeuanganTabungan, idx: number) {
  const isSetor = t.jenis === 'SETOR' || t.jenisTransaksi === 'SETOR';
  const nom = Number(t.nominal || 0);
  const debit = Number(t.debit ?? (isSetor ? nom : 0));
  const kredit = Number(t.kredit ?? (!isSetor ? nom : 0));
  const saldoPrev = Number(t.saldoSebelumnya ?? 0);
  const saldoAfter = Number(t.saldoSetelahnya ?? t.saldoSesudahnya ?? t.saldoAkhir ?? t.saldo ?? (isSetor ? saldoPrev + nom : Math.max(0, saldoPrev - nom)));
  const tgl = t.tanggal || t.tglTransaksi || t.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const sId = t.siswaId || '';
  const tabId = t.tabunganId || t.id || generateStructuredTabunganId(isSetor ? 'SETOR' : 'TARIK', tgl, sId, []);
  const sName = t.namaSiswa || '';
  const kName = t.namaKelas || t.kelasNama || t.kelasId || t.studentClass || t.kelas || '';

  return {
    No: (t as any).no || (t as any).No || (idx + 1),
    TabunganID: tabId,
    id: tabId,
    SiswaID: sId,
    siswaId: sId,
    NISN: t.nisn || '',
    NamaSiswa: sName,
    namaSiswa: sName,
    KelasID: t.kelasId || '',
    NamaKelas: kName,
    Kelas: kName,
    Tanggal: tgl,
    TglTransaksi: tgl,
    Jenis: isSetor ? 'SETOR' : 'TARIK',
    JenisTransaksi: isSetor ? 'SETOR' : 'TARIK',
    Debit: debit,
    Kredit: kredit,
    Nominal: nom,
    SaldoSebelumnya: saldoPrev,
    SaldoSetelahnya: saldoAfter,
    SaldoSesudahnya: saldoAfter,
    SaldoAkhir: saldoAfter,
    Saldo: saldoAfter,
    PetugasID: t.petugasId || t.createdBy || 'Bendahara Tabungan',
    Keterangan: t.catatan || t.keterangan || (isSetor ? 'Setoran Tabungan' : 'Penarikan Tabungan'),
    Status: t.status || 'SUKSES',
    CreatedAt: t.createdAt || new Date().toISOString(),
    UpdatedAt: t.updatedAt || new Date().toISOString(),
    Catatan: t.catatan || t.keterangan || ''
  };
}

/**
 * Konversi tanggal menjadi format kompak TTTTBBDD (misal 2026-07-01 -> 20260701)
 */
export function formatCompactDate(tanggal?: string): string {
  if (!tanggal) {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }
  const cleanStr = String(tanggal).trim();
  const match = cleanStr.match(/(\d{4})[^\d]?(\d{2})[^\d]?(\d{2})/);
  if (match) {
    return `${match[1]}${match[2]}${match[3]}`;
  }
  return cleanStr.replace(/[^0-9]/g, '').slice(0, 8) || new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Generator ID terstruktur umum:
 * PREFIX_nopdkt_TTTTBBDD_nomorUrut
 * Nomor urut ke berapa dihitung spesifik per siswa tersebut (akumulasi riwayat transaksi siswa tsb).
 * Contoh: 
 * - SETOR ke-1: TAB_001_20260701_001
 * - SETOR ke-2: TAB_001_20260715_002
 * - TARIK ke-5: TAR_001_20260701_005
 * - TAGIHAN ke-1: TAG_001_20260701_001
 * - PEMBAYARAN ke-1: BAY_001_20260701_001
 * - INVOICE ke-1: INV_001_20260701_001
 */
export function generateStructuredId(
  prefix: string,
  tanggal?: string,
  nopdkt?: string,
  existingList: Array<any> = [],
  idKey: string = 'id'
): string {
  const compactDate = formatCompactDate(tanggal);
  const cleanNopdkt = nopdkt ? String(nopdkt).trim().replace(/[^a-zA-Z0-9-]/g, '') : '';
  const prefixUpper = prefix.trim().toUpperCase();

  let maxSeq = 0;
  let matchCount = 0;

  if (cleanNopdkt) {
    // Nomor urut ke berapa sesuai siswa tersebut (ketahuan berapa kali siswa tsb bertransaksi)
    const studentPrefix = `${prefixUpper}_${cleanNopdkt.toUpperCase()}_`;

    existingList.forEach(item => {
      if (!item) return;
      const rawId = String(
        item[idKey] ||
        item.id ||
        item.tabunganId ||
        item.tagihanId ||
        item.invoiceId ||
        item.pembayaranId ||
        item.KasID ||
        item.kasId ||
        ''
      ).trim().toUpperCase();

      const itemNopdkt = String(item.nopdkt || item.noPdkt || item.NoPDKT || item.nis || item.NIS || item.siswaId || '').trim().toUpperCase();
      const isStudentMatch = rawId.startsWith(studentPrefix) || (itemNopdkt && (itemNopdkt === cleanNopdkt.toUpperCase() || itemNopdkt.endsWith(cleanNopdkt.toUpperCase())));

      if (isStudentMatch) {
        // Filter jenis jika transaksi TABUNGAN
        const itemJenis = String(item.jenis || item.Jenis || item.jenisTransaksi || '').toUpperCase();
        if (prefixUpper === 'TAB' && itemJenis === 'TARIK') return;
        if (prefixUpper === 'TAR' && (itemJenis === 'SETOR' || !itemJenis)) return;

        matchCount++;
        const match = rawId.match(/_(\d+)$/);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }
    });

    const nextSeq = Math.max(matchCount + 1, maxSeq + 1, 1);
    const padSeq = String(nextSeq).padStart(3, '0');
    return `${prefixUpper}_${cleanNopdkt}_${compactDate}_${padSeq}`;
  } else {
    // Transaksi non-siswa (misal Buku Kas Umum KM / KK) berbasis tanggal
    const datePrefix = `${prefixUpper}_${compactDate}_`;

    existingList.forEach(item => {
      if (!item) return;
      const rawId = String(
        item[idKey] ||
        item.id ||
        item.KasID ||
        item.kasId ||
        ''
      ).trim().toUpperCase();

      if (rawId.startsWith(datePrefix)) {
        matchCount++;
        const match = rawId.match(/_(\d+)$/);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }
    });

    const nextSeq = Math.max(matchCount + 1, maxSeq + 1, 1);
    const padSeq = String(nextSeq).padStart(3, '0');
    return `${prefixUpper}_${compactDate}_${padSeq}`;
  }
}

/**
 * Menghasilkan TabunganID otomatis terstruktur:
 * - Kalau SETOR : TAB_nopdkt_TTTTBBDD_nomor urut (Contoh: TAB_001_20260701_001)
 * - Kalau TARIK : TAR_nopdkt_TTTTBBDD_nomor urut (Contoh: TAR_001_20260701_005)
 */
export function generateStructuredTabunganId(
  arg1?: string,
  arg2?: string,
  arg3?: any,
  arg4?: any
): string {
  let jenis = 'SETOR';
  let tanggal = '';
  let nopdkt = '';
  let existingList: any[] = [];

  if (arg1 && (String(arg1).toUpperCase() === 'SETOR' || String(arg1).toUpperCase() === 'TARIK')) {
    jenis = String(arg1).toUpperCase();
    tanggal = arg2 || '';
    nopdkt = typeof arg3 === 'string' ? arg3 : '';
    existingList = Array.isArray(arg4) ? arg4 : (Array.isArray(arg3) ? arg3 : []);
  } else {
    // Pola lama: generateStructuredTabunganId(tanggal, nopdkt, existingList)
    tanggal = arg1 || '';
    nopdkt = typeof arg2 === 'string' ? arg2 : '';
    existingList = Array.isArray(arg3) ? arg3 : [];
    jenis = 'SETOR';
  }

  const prefix = jenis === 'TARIK' ? 'TAR' : 'TAB';
  return generateStructuredId(prefix, tanggal, nopdkt, existingList, 'tabunganId');
}

/**
 * Menghasilkan TagihanID otomatis terstruktur:
 * TAG_nopdkt_TTTTBBDD_nomor urut (Contoh: TAG_001_20260701_001)
 */
export function generateStructuredTagihanId(
  tanggal?: string,
  nopdkt?: string,
  existingList: Array<any> = []
): string {
  return generateStructuredId('TAG', tanggal, nopdkt, existingList, 'tagihanId');
}

/**
 * Menghasilkan InvoiceID otomatis terstruktur:
 * INV_nopdkt_TTTTBBDD_nomor urut (Contoh: INV_001_20260701_001)
 */
export function generateStructuredInvoiceId(
  tanggal?: string,
  nopdkt?: string,
  existingList: Array<any> = []
): string {
  return generateStructuredId('INV', tanggal, nopdkt, existingList, 'invoiceId');
}

/**
 * Menghasilkan PembayaranID otomatis terstruktur:
 * BAY_nopdkt_TTTTBBDD_nomor urut (Contoh: BAY_001_20260701_001)
 */
export function generateStructuredPembayaranId(
  tanggal?: string,
  nopdkt?: string,
  existingList: Array<any> = []
): string {
  return generateStructuredId('BAY', tanggal, nopdkt, existingList, 'pembayaranId');
}

/**
 * Menghasilkan KasID otomatis terstruktur untuk Buku Kas:
 * - Kas Masuk : KM_TTTTBBDD_nomor urut (Contoh: KM_20260701_001)
 * - Kas Keluar: KK_TTTTBBDD_nomor urut (Contoh: KK_20260701_001)
 */
export function generateStructuredKasId(
  jenis: 'MASUK' | 'KELUAR' | string = 'MASUK',
  tanggal?: string,
  existingList: Array<any> = []
): string {
  const prefix = String(jenis).toUpperCase() === 'KELUAR' ? 'KK' : 'KM';
  return generateStructuredId(prefix, tanggal, undefined, existingList, 'KasID');
}

// Formatter to serialize KeuanganBiaya into Google Sheets BIAYA headers (17 kolom resmi)
export function formatBiayaForSheet(b: any, idx: number) {
  const nom = Number(b.nominal) || 0;
  const stat = b.status || (b.aktif !== false ? 'AKTIF' : 'NONAKTIF');
  return {
    No: idx + 1,
    BiayaID: b.biayaId || b.id || `BYA_${idx + 1}`,
    KodeBiaya: b.kodeBiaya || b.kode || `BYA-${String(idx + 1).padStart(3, '0')}`,
    NamaBiaya: b.namaBiaya || b.nama || '',
    Kategori: b.kategori || 'Iuran',
    Jenjang: b.jenjang || 'Semua Jenjang',
    Target_Kelas: b.targetKelas || b.Target_Kelas || b.kelasNama || b.kelas || 'Semua Kelas',
    KelasID: b.kelasId || b.KelasID || '',
    SiswaID: b.siswaId || b.SiswaID || '',
    NamaSiswa: b.namaSiswa || b.NamaSiswa || 'Semua Siswa',
    Nominal: nom,
    Periode: b.periode || 'Bulanan',
    Wajib: b.wajib || 'Wajib',
    Status: stat,
    Keterangan: b.keterangan || '',
    CreatedAt: b.createdAt || new Date().toISOString(),
    UpdatedAt: b.updatedAt || new Date().toISOString(),
  };
}

// Normalizer for Sheet BIAYA / Excel / TSV
// Header resmi: No | BiayaID | KodeBiaya | NamaBiaya | Kategori | Jenjang | Target_Kelas | KelasID | SiswaID | NamaSiswa | Nominal | Periode | Wajib | Status | Keterangan
export function normalizeBiayaRow(item: any, idx: number): KeuanganBiaya {
  if (!item) item = {};
  const id = String(item.BiayaID || item.biayaId || item.id || item.kode || `BYA_${idx + 1}`).trim();
  const kodeBiaya = String(item.KodeBiaya || item.kodeBiaya || item.kode || item.BiayaID || item.id || `BYA-${String(idx + 1).padStart(3, '0')}`).trim();
  const namaBiaya = String(item.NamaBiaya || item.namaBiaya || item.namaPos || item.nama || item.posBiaya || `Pos Biaya ${idx + 1}`).trim();
  
  let rawNominal = item.Nominal ?? item.nominal ?? item.tarif ?? item.jumlah ?? 0;
  const nominal = parseNumeric(rawNominal);

  const kategori = String(item.Kategori || item.kategori || 'Iuran').trim();
  const jenjang = String(item.Jenjang || item.jenjang || 'Semua Jenjang').trim();
  const targetKelas = String(item.Target_Kelas || item.targetKelas || item.TargetKelas || item.kelas || item.kelasNama || 'Semua Kelas').trim();
  const kelasId = String(item.KelasID || item.kelasId || '').trim();
  const siswaId = String(item.SiswaID || item.siswaId || '').trim();
  const namaSiswa = String(item.NamaSiswa || item.namaSiswa || 'Semua Siswa').trim();
  const periode = String(item.Periode || item.periode || item.frekuensi || 'Bulanan').trim();
  const wajib = String(item.Wajib || item.wajib || item.statusWajib || 'Wajib').trim();
  const statusRaw = String(item.Status || item.status || (item.aktif !== false ? 'AKTIF' : 'NONAKTIF')).toUpperCase();
  const status = statusRaw.includes('NON') ? 'NONAKTIF' : 'AKTIF';
  const keterangan = String(item.Keterangan || item.keterangan || item.deskripsi || '').trim();

  return {
    id,
    biayaId: id,
    kodeBiaya,
    nama: namaBiaya,
    namaBiaya,
    kategori,
    jenjang,
    targetKelas,
    kelasId,
    kelasNama: targetKelas,
    siswaId,
    namaSiswa: siswaId ? namaSiswa : 'Semua Siswa',
    nominal,
    periode,
    wajib,
    status,
    aktif: status === 'AKTIF',
    keterangan,
    createdAt: parseDateString(item.CreatedAt || item.createdAt) || new Date().toISOString().slice(0, 10),
    updatedAt: parseDateString(item.UpdatedAt || item.updatedAt) || new Date().toISOString().slice(0, 10),
  };
}

export function normalizeMasterTarifItem(item: any, idx: number) {
  const norm = normalizeBiayaRow(item, idx);
  return {
    ...norm,
    id: norm.id || norm.biayaId,
    kode: norm.kodeBiaya || norm.id || `BYA-${String(idx + 1).padStart(3, '0')}`,
    namaPos: norm.namaBiaya || norm.nama || `Pos Biaya ${idx + 1}`,
    nama: norm.namaBiaya || norm.nama,
    frekuensi: norm.periode || 'Bulanan',
    nominal: Number(norm.nominal) || 0,
    kelas: norm.targetKelas || 'Semua Kelas',
    status: norm.wajib || 'Wajib',
    kategori: norm.kategori || 'Iuran',
    jenjang: norm.jenjang || 'Semua Jenjang',
  };
}

// Normalizer for Sheet KAS / Buku Kas Umum
// Header resmi: KasID | Tanggal | Jenis | Kategori | Keterangan | Nominal | Petugas | Referensi
export function normalizeKasRow(item: any, idx: number): KeuanganKas {
  if (!item) item = {};
  const explicitId = String(item.KasID || item.kasId || item.id || item.NoTransaksi || '').trim();
  const tanggal = parseDateString(item.Tanggal || item.tanggal || item.CreatedAt || item.createdAt) || new Date().toISOString().slice(0, 10);
  const rawJenis = String(item.Jenis || item.jenis || item.Tipe || item.tipe || '').toUpperCase().trim();
  const rawDebit = parseNumeric(item.Debit ?? item.debit ?? item.Masuk ?? item.masuk ?? 0);
  const rawKredit = parseNumeric(item.Kredit ?? item.kredit ?? item.Keluar ?? item.keluar ?? 0);

  let jenis: 'MASUK' | 'KELUAR' = 'MASUK';
  if (rawJenis.includes('KELUAR') || rawJenis.includes('PENGELUARAN') || explicitId.toUpperCase().startsWith('KK_')) {
    jenis = 'KELUAR';
  } else if (rawJenis.includes('MASUK') || rawJenis.includes('PENERIMAAN') || explicitId.toUpperCase().startsWith('KM_')) {
    jenis = 'MASUK';
  } else if (rawKredit > 0 && rawDebit === 0) {
    jenis = 'KELUAR';
  }

  const nominal = parseNumeric(item.Nominal ?? item.nominal ?? (jenis === 'MASUK' ? rawDebit : rawKredit) ?? item.Jumlah ?? item.jumlah ?? 0);
  const kategori = String(item.Kategori || item.kategori || (jenis === 'MASUK' ? 'Infaq / Sumbangan' : 'Operasional')).trim();
  const keterangan = String(item.Keterangan || item.keterangan || item.Uraian || item.uraian || item.Catatan || item.catatan || 'Transaksi Kas').trim();
  const petugas = String(item.Petugas || item.petugas || item.PetugasID || item.petugasId || 'Bendahara').trim();
  const referensi = String(item.Referensi || item.referensi || item.NoBukti || item.noBukti || '-').trim();
  const saldo = parseNumeric(item.Saldo ?? item.saldo ?? 0);
  const id = (explicitId && !explicitId.startsWith('remote_')) ? explicitId : `${jenis === 'KELUAR' ? 'KK' : 'KM'}_${formatCompactDate(tanggal)}_${String(idx + 1).padStart(3, '0')}`;

  return {
    id,
    tanggal,
    kategori,
    jenis,
    nominal,
    keterangan,
    petugas,
    referensi,
    saldo,
    createdAt: parseDateString(item.CreatedAt || item.createdAt) || tanggal
  };
}

export function deduplicateKasList(list: any[]): KeuanganKas[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const map = new Map<string, KeuanganKas>();
  list.forEach((raw, idx) => {
    if (!raw) return;
    const item = normalizeKasRow(raw, idx);
    if (item.kategori === 'Tagihan Siswa') return;
    const key = `${item.id}__${item.tanggal}__${item.jenis}__${item.nominal}`;
    if (!map.has(item.id) && !map.has(key)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}


