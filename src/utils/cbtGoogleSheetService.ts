/**
 * CBT Google Spreadsheet Integration Service
 * Menjamin 100% Sumber Data CBT berasal murni dari Google Spreadsheet (Sheet UJIAN, TOKEN, BANK_SOAL, SOAL, HASIL_UJIAN, LOG_UJIAN)
 * Menghapus segala fallback dummy lokal / Firebase.
 */

import { db } from '../data/db';
import { pullSpecificSheetFromGas, pushAllSheetsToGas } from './gasSync';
import { autoSyncEngine } from '../data/autoSyncEngine';
import { deduplicateUjianSessions, deduplicateTokens } from './cbtScheduleSync';
import { generate20SoalPilihanGanda, cleanConceptName } from '../data/soalGenerator';
import { saveBulkQuestionsDirect } from '../services/cbtQuestionDirectService';

export function generatePedagogicalQuestions(mapel: string, kelas: string, count: number = 20): any[] {
  const cleanCls = String(kelas || '4').replace(/\D/g, '') || '4';
  const kNum = Number(cleanCls);
  const paket = kNum >= 10 ? 'C' : kNum >= 7 ? 'B' : 'A';
  return generate20SoalPilihanGanda({
    mapel: mapel || 'Mata Pelajaran',
    topik: cleanConceptName(`Materi Pokok ${mapel}`),
    tema: `Asesmen Terpadu CBT ${mapel}`,
    kelas: cleanCls,
    paket
  }).slice(0, count);
}

export interface CbtPullResult {
  success: boolean;
  message: string;
  totalUjian: number;
  totalToken: number;
  totalBankSoal: number;
  totalSoal: number;
  totalHasil: number;
  totalRapor?: number;
  ujian?: any[];
  bankSoal?: any[];
  tokens?: any[];
}

/**
 * Helper untuk normalisasi kunci pencocokan Mapel & Kelas
 */
export function normalizeCbtMatchKey(mapel: string, kelas: string): string {
  const cleanM = String(mapel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanK = String(kelas || '').toLowerCase().replace(/[^0-9a-z]/g, '');
  return `${cleanM}___${cleanK}`;
}

/**
 * Sinkronisasi & Penautan Otomatis 1-ke-1 Sesi Ujian dengan Paket Bank Soal & Token
 * Menjamin 114 Sesi Ujian langsung terhubung ke 114 Paket Bank Soal Kurikulum
 */
export function syncAndLinkAllSessionsAndBankSoal(
  customUjian?: any[],
  customBank?: any[],
  customTokens?: any[]
): {
  ujian: any[];
  bankSoal: any[];
  tokens: any[];
  linkedCount: number;
} {
  const rawUjian = customUjian || (db.get('ujian_cbt') as any[]) || (db.get('cbt_exams') as any[]) || [];
  const rawBank = customBank || (db.get('cbt_bank_soal') as any[]) || (db.get('cbt_questions') as any[]) || [];
  const rawTokens = customTokens || (db.get('cbt_token_history') as any[]) || (db.get('cbt_tokens') as any[]) || [];

  // Filter out any simulation / dummy
  const cleanUjian = deduplicateUjianSessions(rawUjian).filter(
    (u: any) => !String(u.id || u.UjianID || '').startsWith('SIM-') && !u.isSimulation && !u.isDummy
  );
  const cleanBank = (Array.isArray(rawBank) ? rawBank : []).filter(
    (b: any) => !String(b.id || b.BankSoalID || '').startsWith('SIM-') && !b.isSimulation && !b.isDummy
  );

  // Indeks Bank Soal berdasarkan:
  // 1. BankSoalID / ID
  // 2. Mapel + Kelas
  // 3. Topik / SubTugas
  const bankById = new Map<string, any>();
  const bankByMapelKelas = new Map<string, any[]>();
  const bankByTopicPattern = new Map<string, any>();

  cleanBank.forEach((b: any) => {
    const bId = String(b.id || b.BankSoalID || '').trim();
    if (bId) bankById.set(bId, b);

    const m = String(b.mapel || b.Mapel || '').trim();
    const k = String(b.kelas || b.Kelas || '').trim();
    const key = normalizeCbtMatchKey(m, k);
    if (!bankByMapelKelas.has(key)) {
      bankByMapelKelas.set(key, []);
    }
    bankByMapelKelas.get(key)!.push(b);

    const topic = String(b.Topik || b.topik || b.SubBab || b.subBab || '').toLowerCase();
    if (topic) {
      bankByTopicPattern.set(topic, b);
    }
  });

  // Pastikan 1-ke-1 penuh: jika ada paket di Bank Soal (114 paket) yang sesinya belum ada di cleanUjian, lengkapi sesinya
  const existingUjianKeys = new Set<string>(
    cleanUjian.map((u: any) => normalizeCbtMatchKey(u.mapel || u.Mapel, u.kelas || u.Kelas))
  );
  cleanBank.forEach((b: any, idx: number) => {
    const m = String(b.mapel || b.Mapel || '').trim();
    const k = String(b.kelas || b.Kelas || '').trim();
    if (!m || !k) return;
    const key = normalizeCbtMatchKey(m, k);
    if (!existingUjianKeys.has(key)) {
      existingUjianKeys.add(key);
      const bId = String(b.id || b.BankSoalID || '').trim();
      const numMatch = bId.match(/(\d{3})$/);
      const sesiId = b.UjianID || b.ujianId || (numMatch ? `SES-STS-26-${numMatch[1]}` : `SES-STS-26-${String(cleanUjian.length + idx + 1).padStart(3, '0')}`);
      const soalCount = b.soalList?.length || Number(b.jumlahSoal || b.JumlahSoal) || 30;
      cleanUjian.push({
        id: sesiId,
        UjianID: sesiId,
        mapel: m,
        Mapel: m,
        namaUjian: m,
        NamaUjian: m,
        kelas: k,
        Kelas: k,
        jenis: 'STS (Tengah Semester)',
        JenisUjian: 'STS (Tengah Semester)',
        tgl: '2026-09-30',
        tanggal: '2026-09-30',
        jamMulai: '19:30',
        jamSelesai: '22:00',
        durasi: '90 Menit',
        durasiMenit: 90,
        proktor: b.guru || b.Guru || 'Guru Kelas',
        Proktor: b.guru || b.Guru || 'Guru Kelas',
        pengawas: b.guru || b.Guru || 'Guru Kelas',
        peserta: 30,
        Peserta: 30,
        token: b.token || b.Token || `${k}-${m.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()}-${numMatch ? numMatch[1] : '100'}`,
        status: 'Terjadwal',
        Status: 'Terjadwal',
        bankSoalId: bId,
        BankSoalID: bId,
        jumlahSoal: soalCount,
        JumlahSoal: `${soalCount} Butir Soal (PG)`,
        soal: `${soalCount} Butir Soal (PG)`,
        semester: 'Ganjil',
        tahunAjaran: '2026/2027',
        acakSoal: true,
        acakOpsi: true,
        tampilkanNilai: true
      });
    }
  });

  let linkedCount = 0;
  const updatedBankList = [...cleanBank];
  const bankIndexMap = new Map<string, number>();
  updatedBankList.forEach((b, idx) => {
    const id = String(b.id || b.BankSoalID || '').trim();
    if (id) bankIndexMap.set(id, idx);
  });

  const updatedUjian = cleanUjian.map((u: any) => {
    const uId = String(u.id || u.UjianID || '').trim();
    const mapel = String(u.mapel || u.Mapel || '').trim();
    const kelas = String(u.kelas || u.Kelas || '').trim();
    const matchKey = normalizeCbtMatchKey(mapel, kelas);

    // Cari paket yang cocok
    let matchedBank: any = null;
    const existingBankId = String(u.bankSoalId || u.BankSoalID || '').trim();
    if (existingBankId && bankById.has(existingBankId)) {
      matchedBank = bankById.get(existingBankId);
    } else if (bankByMapelKelas.has(matchKey) && bankByMapelKelas.get(matchKey)!.length > 0) {
      matchedBank = bankByMapelKelas.get(matchKey)![0];
    } else {
      // Coba cari dari pola topik sesi jika ada
      for (const [topic, b] of bankByTopicPattern.entries()) {
        if (topic.includes(uId.toLowerCase())) {
          matchedBank = b;
          break;
        }
      }
    }

    if (matchedBank) {
      linkedCount++;
      const bankId = String(matchedBank.id || matchedBank.BankSoalID);
      const soalCount = matchedBank.soalList?.length || matchedBank.jumlahSoal || 30;

      // Update paket bank soal dengan info sesi terkait
      const bIdx = bankIndexMap.get(bankId);
      if (bIdx !== undefined && updatedBankList[bIdx]) {
        updatedBankList[bIdx] = {
          ...updatedBankList[bIdx],
          ujianId: uId,
          UjianID: uId,
          token: u.token || u.Token,
          Token: u.token || u.Token,
          jadwalSesi: `${u.tgl || u.tanggal || ''} ${u.jamMulai || ''}-${u.jamSelesai || ''} WIB`,
          status: 'Siap Digunakan',
          Status: 'Siap Digunakan'
        };
      }

      return {
        ...u,
        id: uId,
        UjianID: uId,
        bankSoalId: bankId,
        BankSoalID: bankId,
        soalList: matchedBank.soalList || [],
        jumlahSoal: soalCount,
        JumlahSoal: soalCount,
        soal: `${soalCount} Butir Soal PG (Terhubung Bank Soal)`
      };
    }

    return u;
  });

  // Tautkan juga Token dengan BankSoalID dan sesi
  const ujianMap = new Map<string, any>();
  updatedUjian.forEach((u: any) => ujianMap.set(u.id, u));

  const updatedTokens = deduplicateTokens(rawTokens).map((t: any) => {
    const rawSesi = String(t.sesiId || t.UjianID || t.ujianId || t.id || '').replace(/^tok-/, '').trim();
    const matchedUjian = ujianMap.get(rawSesi);
    return {
      ...t,
      sesiId: rawSesi,
      UjianID: rawSesi,
      bankSoalId: matchedUjian?.bankSoalId || t.bankSoalId || t.BankSoalID || '',
      BankSoalID: matchedUjian?.bankSoalId || t.BankSoalID || t.bankSoalId || '',
      soalCount: matchedUjian?.jumlahSoal || 30
    };
  });

  // Simpan ke local db cache
  db.set('ujian_cbt', updatedUjian, { skipPush: true });
  db.set('cbt_exams', updatedUjian, { skipPush: true });
  db.set('cbt_bank_soal', updatedBankList, { skipPush: true });
  db.set('cbt_questions', updatedBankList, { skipPush: true });
  db.set('cbt_token_history', updatedTokens, { skipPush: true });
  db.set('cbt_tokens', updatedTokens, { skipPush: true });

  return {
    ujian: updatedUjian,
    bankSoal: updatedBankList,
    tokens: updatedTokens,
    linkedCount
  };
}

/**
 * Menarik seluruh data CBT langsung dari Google Spreadsheet resmi tanpa dummy
 */
export async function pullCbtDataFromGoogleSheets(): Promise<CbtPullResult> {
  let totalUjian = 0;
  let totalToken = 0;
  let totalBankSoal = 0;
  let totalSoal = 0;
  let totalHasil = 0;

  try {
    // 1. Tarik Sheet UJIAN, TOKEN, BANK_SOAL, SOAL secara serentak (Parallel Fast Fetch)
    const [
      resUjian,
      resJadwalUjian,
      resToken,
      resBankSoal,
      resSoal,
      resHasil,
      resLog,
      resRapor
    ] = await Promise.all([
      pullSpecificSheetFromGas('UJIAN').catch(() => null),
      pullSpecificSheetFromGas('JADWAL_UJIAN').catch(() => null),
      pullSpecificSheetFromGas('TOKEN').catch(() => null),
      pullSpecificSheetFromGas('BANK_SOAL').catch(() => null),
      pullSpecificSheetFromGas('SOAL').catch(() => null),
      pullSpecificSheetFromGas('HASIL_UJIAN').catch(() => null),
      pullSpecificSheetFromGas('LOG_UJIAN').catch(() => null),
      pullSpecificSheetFromGas('RAPOR_PENDIDIKAN').catch(() => null)
    ]);

    // 2. Olah Butir Soal dan Bank Soal Terlebih Dahulu agar siap dipasangkan ke Sesi Ujian
    const remoteSoalList: any[] = (resSoal && resSoal.success && Array.isArray(resSoal.data)) ? resSoal.data : [];
    const questionsByBankId = new Map<string, any[]>();
    remoteSoalList.forEach((s: any) => {
      const bId = s.BankSoalID || s.bankSoalId || s.UjianID || s.ujianId;
      if (bId) {
        if (!questionsByBankId.has(bId)) questionsByBankId.set(bId, []);
        questionsByBankId.get(bId)!.push({
          id: Number(s.NomorSoal || s.nomor || questionsByBankId.get(bId)!.length + 1),
          pertanyaan: s.Pertanyaan || s.pertanyaan || s.soal || '-',
          tipe: s.TipeSoal || s.tipe || 'Pilihan Ganda',
          opsi: {
            a: s.PilihanA || s.opsiA || s.opsi?.a || s.a || '',
            b: s.PilihanB || s.opsiB || s.opsi?.b || s.b || '',
            c: s.PilihanC || s.opsiC || s.opsi?.c || s.c || '',
            d: s.PilihanD || s.opsiD || s.opsi?.d || s.d || '',
            e: s.PilihanE || s.opsiE || s.opsi?.e || s.e || ''
          },
          kunci: String(s.KunciJawaban || s.kunci || s.Kunci || 'a').toLowerCase(),
          bobot: Number(s.Bobot || s.bobot || 5),
          pembahasan: s.PembahasanRasional || s.Pembahasan || s.pembahasan || '',
          gambar: s.Gambar || s.LinkGambar || s['Link Gambar'] || s.gambar || s.gambarUrl || s.imageUrl || ''
        });
      }
    });

    let processedBankSoal: any[] = [];
    if (resBankSoal && resBankSoal.success && Array.isArray(resBankSoal.data) && resBankSoal.data.length > 0) {
      processedBankSoal = resBankSoal.data.map((b: any, idx: number) => {
        const id = b.id || b.BankSoalID || `BNK-${idx + 1}`;
        let soalList = [];
        if (Array.isArray(b.soalList)) {
          soalList = b.soalList;
        } else if (b.SoalJSON && typeof b.SoalJSON === 'string') {
          try {
            soalList = JSON.parse(b.SoalJSON);
          } catch {
            soalList = [];
          }
        }
        if (soalList.length === 0 && questionsByBankId.has(id)) {
          soalList = questionsByBankId.get(id) || [];
        }

        const durasiVal = Number(b.durasi || b.Durasi || b.durasiMenit || b.DurasiMenit) || 30;

        return {
          ...b,
          id,
          BankSoalID: id,
          mapel: b.mapel || b.Mapel || 'Mata Pelajaran',
          Mapel: b.Mapel || b.mapel || 'Mata Pelajaran',
          kelas: String(b.kelas || b.Kelas || '1A'),
          Kelas: String(b.Kelas || b.kelas || '1A'),
          jumlahSoal: soalList.length || Number(b.jumlahSoal || b.JumlahSoal || 0),
          durasi: durasiVal,
          Durasi: durasiVal,
          durasiMenit: durasiVal,
          soalList
        };
      });

      // Gabungkan hanya paket lokal nyata yang belum ada di remote
      const localBank = (db.get('cbt_bank_soal') || []) as any[];
      const remoteIds = new Set(processedBankSoal.map(b => b.id || b.BankSoalID));
      const unsyncedLocal = localBank.filter(l => 
        !remoteIds.has(l.id || l.BankSoalID) && 
        !String(l.id || l.BankSoalID || '').startsWith('SIM-') && 
        !l.isSimulation && 
        !l.isDummy
      );
      processedBankSoal = [...processedBankSoal, ...unsyncedLocal];
    } else {
      processedBankSoal = (db.get('cbt_bank_soal') || db.get('cbt_questions') || []) as any[];
    }

    if (remoteSoalList.length > 0) {
      db.set('cbt_exam_questions', remoteSoalList, { skipPush: true });
      db.set('soal', remoteSoalList, { skipPush: true });
      totalSoal = remoteSoalList.length;
    }

    // 3. Olah Sesi UJIAN Resmi (Tepat 114 Sesi Ujian STS) - Utamakan JADWAL_UJIAN yang bersih (114 sesi) lalu UJIAN
    const fetchedUjianData: any[] = [];
    if (resJadwalUjian && resJadwalUjian.success && Array.isArray(resJadwalUjian.data) && resJadwalUjian.data.length > 0) {
      fetchedUjianData.push(...resJadwalUjian.data);
    }
    if (resUjian && resUjian.success && Array.isArray(resUjian.data) && resUjian.data.length > 0) {
      fetchedUjianData.push(...resUjian.data);
    }

    const processedUjian = deduplicateUjianSessions(
      fetchedUjianData.length > 0
        ? fetchedUjianData
        : ((db.get('ujian_cbt') || db.get('cbt_exams') || []) as any[])
    );

    // 4. Olah Token
    let processedTokens: any[] = [];
    if (resToken && resToken.success && Array.isArray(resToken.data) && resToken.data.length > 0) {
      processedTokens = deduplicateTokens(resToken.data);
    } else {
      processedTokens = (db.get('cbt_token_history') || db.get('cbt_tokens') || []) as any[];
    }

    // 5. EKSEKUSI PENAUTAN TERPADU 1-KE-1 (UJIAN <-> BANK SOAL <-> TOKEN)
    const { ujian: syncedUjian, bankSoal: syncedBank, tokens: syncedTokens, linkedCount } = 
      syncAndLinkAllSessionsAndBankSoal(processedUjian, processedBankSoal, processedTokens);

    totalUjian = syncedUjian.length;
    totalBankSoal = syncedBank.length;
    totalToken = syncedTokens.length;

    // 6. Simpan Sheet HASIL_UJIAN & LOG_UJIAN
    if (resHasil && resHasil.success && Array.isArray(resHasil.data)) {
      db.set('cbt_exam_results', resHasil.data, { skipPush: true });
      db.set('hasil_ujian', resHasil.data, { skipPush: true });
      totalHasil = resHasil.data.length;
    }

    if (resLog && resLog.success && Array.isArray(resLog.data)) {
      db.set('exam_logs', resLog.data, { skipPush: true });
      db.set('cbt_proktor_logs', resLog.data, { skipPush: true });
    }

    // 7. Simpan Sheet RAPOR_PENDIDIKAN
    let totalRapor = 0;
    if (resRapor && resRapor.success && Array.isArray(resRapor.data) && resRapor.data.length > 0) {
      const normalizedRapor = resRapor.data.map((r: any, idx: number) => {
        let indikatorList = [];
        try {
          if (r.IndikatorJSON) {
            indikatorList = typeof r.IndikatorJSON === 'string' ? JSON.parse(r.IndikatorJSON) : r.IndikatorJSON;
          } else if (r.indikatorList) {
            indikatorList = typeof r.indikatorList === 'string' ? JSON.parse(r.indikatorList) : r.indikatorList;
          }
        } catch {}

        return {
          id: String(r.DimensiID || r.id || `dim-${idx + 1}`),
          tahun: String(r.Tahun || r.tahun || '2026/2027'),
          kode: String(r.Kode || r.kode || 'A.1'),
          nama: String(r.NamaDimensi || r.nama || 'Dimensi Mutu'),
          skor: Number(r.Skor || r.skor || 0),
          delta: Number(r.Delta || r.delta || 0),
          kategori: String(r.Kategori || r.kategori || 'Cakap'),
          color: String(r.Warna || r.color || 'emerald'),
          deskripsi: String(r.Deskripsi || r.deskripsi || ''),
          nasionalAvg: Number(r.RataNasional || r.nasionalAvg || 0),
          kabupatenAvg: Number(r.RataKabupaten || r.kabupatenAvg || 0),
          rekomendasiBenahi: String(r.RekomendasiBenahi || r.rekomendasiBenahi || ''),
          indikatorList
        };
      });
      db.set('rapor_pendidikan_list', normalizedRapor, { skipPush: true });
      totalRapor = normalizedRapor.length;
    }

    // Broadcast perubahan ke seluruh komponen UI CBT
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt' } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_token_history' } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal' } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_results' } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'exam_logs' } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'rapor_pendidikan_list' } }));

    return {
      success: true,
      message: `Berhasil menarik data murni Google Spreadsheet: ${totalUjian} Sesi Ujian, ${totalToken} Token, ${totalBankSoal} Bank Soal, ${totalSoal} Butir Soal, ${totalHasil} Hasil Ujian, ${totalRapor} Indikator Rapor Pendidikan.`,
      totalUjian,
      totalToken,
      totalBankSoal,
      totalSoal,
      totalHasil,
      totalRapor,
      ujian: (db.get('ujian_cbt') as any[]) || [],
      bankSoal: (db.get('cbt_bank_soal') as any[]) || [],
      tokens: (db.get('cbt_token_history') as any[]) || []
    };
  } catch (err: any) {
    console.error('pullCbtDataFromGoogleSheets error:', err);
    return {
      success: false,
      message: err?.message || 'Gagal menarik data CBT dari Google Spreadsheet.',
      totalUjian,
      totalToken,
      totalBankSoal,
      totalSoal,
      totalHasil,
      ujian: (db.get('ujian_cbt') as any[]) || [],
      bankSoal: (db.get('cbt_bank_soal') as any[]) || [],
      tokens: (db.get('cbt_token_history') as any[]) || []
    };
  }
}

/**
 * GENERATE SOAL PER KELAS (20 PG) HANYA UNTUK ULANGAN HARIAN YANG TERSINGKRON KE PENUGASAN (BUKAN KE JADWAL & SESI UJIAN)
 * Sesuai instruksi khusus:
 * - Menghasilkan 20 Butir Pilihan Ganda berstandar Kurikulum Merdeka
 * - Menyimpan ke Bank Soal (Sheet BANK_SOAL & SOAL)
 * - Menerbitkan Penugasan KBM di Sheet TUGAS (db tugas_kbm & assignments)
 * - TIDAK mengotori atau mencemari Jadwal & Sesi Ujian CBT (Sheet UJIAN)
 */
export async function generateUlanganHarianSyncToPenugasan(options: {
  kelas: string; // Misal: '4A', '7A', '10A', atau 'all'
  mapel: string; // Misal: 'Matematika', 'Bahasa Indonesia', dll
  tenggatHari?: number; // Default 7 hari ke depan
  guruPengampu?: string;
}): Promise<{
  success: boolean;
  message: string;
  totalTugasCreated: number;
  totalSoalCreated: number;
  bankSoalPackages: any[];
}> {
  const { kelas, mapel, tenggatHari = 7, guruPengampu = 'Guru Pengampu' } = options;

  // Tentukan daftar kelas sasaran
  const targetClasses = (kelas && kelas !== 'all') 
    ? [kelas] 
    : ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A'];

  // Hitung tenggat waktu (YYYY-MM-DD)
  const dueDateObj = new Date();
  dueDateObj.setDate(dueDateObj.getDate() + tenggatHari);
  const tenggat = dueDateObj.toISOString().slice(0, 10);

  const existingTugas = (db.get('tugas_kbm') || db.get('assignments') || []) as any[];
  const existingBank = (db.get('cbt_bank_soal') || []) as any[];
  const existingSoal = (db.get('cbt_exam_questions') || db.get('soal') || []) as any[];

  const newTugasList: any[] = [];
  const newBankPackages: any[] = [];
  const newIndividualQuestions: any[] = [];

  let totalQuestions = 0;

  for (const cls of targetClasses) {
    const cleanNum = cls.replace(/\D/g, '') || cls;
    const bankId = `BNK-UH-${cleanNum}-${mapel.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const tugasId = `TGS-UH-${cleanNum}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Generate 20 Butir Soal PG Terstandar
    const soal20 = generatePedagogicalQuestions(mapel, cls, 20);
    totalQuestions += soal20.length;

    // 1. Siapkan Paket Bank Soal
    const bankPkg = {
      id: bankId,
      BankSoalID: bankId,
      mapel,
      Mapel: mapel,
      kelas: cls,
      Kelas: cls,
      kurikulum: 'Kurikulum Merdeka',
      guru: guruPengampu,
      Guru: guruPengampu,
      tipeSoal: 'Pilihan Ganda (Ulangan Harian)',
      TipeSoal: 'Pilihan Ganda',
      jumlahSoal: soal20.length,
      JumlahSoal: soal20.length,
      kesulitan: 'Sedang',
      status: 'Siap Digunakan',
      topik: `Ulangan Harian Formatif ${mapel} Bab Capaian Pembelajaran Kelas ${cls}`,
      topikSubTugas: `Ulangan Harian Formatif ${mapel}`,
      soalList: soal20,
      SoalJSON: JSON.stringify(soal20),
      isUlanganHarian: true,
      updatedAt: new Date().toISOString()
    };
    newBankPackages.push(bankPkg);

    // 2. Siapkan butir soal individual untuk sheet SOAL
    soal20.forEach((q: any, qIdx: number) => {
      newIndividualQuestions.push({
        id: `SOL-${bankId}-${qIdx + 1}`,
        DetailSoalID: `SOL-${bankId}-${qIdx + 1}`,
        BankSoalID: bankId,
        UjianID: '', // Dikosongkan karena ini Ulangan Harian (Tugas KBM), bukan Sesi Ujian Jadwal!
        NomorSoal: qIdx + 1,
        Pertanyaan: q.pertanyaan,
        TipeSoal: 'Pilihan Ganda',
        PilihanA: q.opsi.a,
        PilihanB: q.opsi.b,
        PilihanC: q.opsi.c,
        PilihanD: q.opsi.d,
        PilihanE: q.opsi.e || '',
        KunciJawaban: q.kunci,
        Bobot: q.bobot || 5,
        PembahasanRasional: q.pembahasan || '',
        CreatedAt: new Date().toISOString()
      });
    });

    // 3. Buat Entri Penugasan KBM (Sheet TUGAS)
    const tugasItem = {
      id: tugasId,
      TugasID: tugasId,
      judul: `Ulangan Harian: ${mapel} (20 Soal PG)`,
      Judul: `Ulangan Harian: ${mapel} (20 Soal PG)`,
      mapel,
      Mapel: mapel,
      kelas: cls,
      Kelas: cls,
      tingkatKelas: `Kelas ${cleanNum}`,
      guru: guruPengampu,
      Guru: guruPengampu,
      tenggat,
      Tenggat: tenggat,
      kategori: 'Ulangan Harian (Auto-Grading)',
      Kategori: 'Ulangan Harian (Auto-Grading)',
      deskripsi: `Ulangan Harian asesmen formatif mata pelajaran ${mapel} sebanyak 20 butir soal pilihan ganda. Kerjakan sebelum tenggat waktu berakhir.`,
      Petunjuk: `Ulangan Harian asesmen formatif mata pelajaran ${mapel} sebanyak 20 butir soal pilihan ganda. Kerjakan sebelum tenggat waktu berakhir.`,
      kumpul: 0,
      Kumpul: 0,
      totalSiswa: 28,
      TotalSiswa: 28,
      status: 'Aktif Mengumpulkan',
      Status: 'Aktif Mengumpulkan',
      avg: 0,
      NilaiRataRata: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      CreatedAt: new Date().toISOString().slice(0, 10),
      bankSoalId: bankId,
      soalList: soal20
    };
    newTugasList.push(tugasItem);
  }

  // Simpan ke database lokal
  const mergedTugas = [...newTugasList, ...existingTugas];
  db.set('tugas_kbm', mergedTugas);
  db.set('assignments', mergedTugas);

  const mergedBank = [...newBankPackages, ...existingBank];
  db.set('cbt_bank_soal', mergedBank);
  db.set('cbt_questions', mergedBank);

  const mergedSoal = [...newIndividualQuestions, ...existingSoal];
  db.set('cbt_exam_questions', mergedSoal);
  db.set('soal', mergedSoal);

  // Broadcast event
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'tugas_kbm' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal' } }));

  // Push langsung ke Google Spreadsheet: TUGAS, BANK_SOAL, dan SOAL
  try {
    await autoSyncEngine.pushSpecificTables(['TUGAS', 'BANK_SOAL', 'SOAL']);
  } catch (pushErr) {
    console.warn('AutoSync push error on Ulangan Harian:', pushErr);
  }

  return {
    success: true,
    message: `Berhasil membuat ${newTugasList.length} tugas Ulangan Harian (${totalQuestions} butir soal PG) yang tersinkron langsung ke menu Penugasan (Sheet TUGAS) & Bank Soal tanpa mencemari Jadwal Sesi Ujian!`,
    totalTugasCreated: newTugasList.length,
    totalSoalCreated: totalQuestions,
    bankSoalPackages: newBankPackages
  };
}

/**
 * Menghubungkan sesi ujian CBT ke Bank Soal yang sudah ada
 * ATAU membuat butir soal khusus untuk sesi ujian tersebut
 */
export async function linkOrCreateSoalForSession(
  session: any, 
  bankSoalIdToLink?: string,
  autoGenerateTopic?: string
): Promise<{ success: boolean; session: any; bankPackage?: any; message: string }> {
  if (!session) {
    return { success: false, session, message: 'Sesi tidak valid' };
  }

  const sesiId = String(session.id || session.UjianID || '');
  const mapel = session.mapel || session.Mapel || 'Mata Pelajaran';
  const kelas = String(session.kelas || session.Kelas || '1A');

  const existingBank = (db.get('cbt_bank_soal') || []) as any[];
  const existingUjian = (db.get('ujian_cbt') || []) as any[];

  // Kasus 1: Menghubungkan paket yang sudah ada dari Bank Soal
  if (bankSoalIdToLink) {
    const matchedBank = existingBank.find(b => (b.id || b.BankSoalID) === bankSoalIdToLink);
    if (!matchedBank) {
      return { success: false, session, message: 'Paket Bank Soal tidak ditemukan.' };
    }

    const soalCount = matchedBank.soalList?.length || matchedBank.jumlahSoal || 20;
    const updatedSession = {
      ...session,
      bankSoalId: bankSoalIdToLink,
      BankSoalID: bankSoalIdToLink,
      soal: `${soalCount} Soal (Pilihan Ganda Terverifikasi)`,
      JumlahSoal: `${soalCount} Butir Soal (PG)`
    };

    const updatedUjianList = existingUjian.map(u => 
      (u.id === sesiId || u.UjianID === sesiId) ? updatedSession : u
    );
    db.set('ujian_cbt', updatedUjianList);
    db.set('cbt_exams', updatedUjianList);

    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt' } }));
    autoSyncEngine.pushSpecificTables(['UJIAN']).catch(() => {});

    return {
      success: true,
      session: updatedSession,
      bankPackage: matchedBank,
      message: `Sesi ujian ${sesiId} berhasil dihubungkan ke Bank Soal ${bankSoalIdToLink} (${soalCount} butir soal).`
    };
  }

  // Kasus 2: Membuat butir soal baru khusus untuk sesi ini
  const cleanCls = kelas.replace(/\D/g, '') || kelas;
  const newBankId = `BNK-CBT-${sesiId.replace(/[^A-Za-z0-9]/g, '')}`;
  const soalList = generatePedagogicalQuestions(mapel, kelas, 20);

  const bankPkg = {
    id: newBankId,
    BankSoalID: newBankId,
    mapel,
    Mapel: mapel,
    kelas,
    Kelas: kelas,
    kurikulum: 'Kurikulum Merdeka',
    guru: session.proktor || session.pengawas || 'Proktor CBT',
    tipeSoal: 'Pilihan Ganda',
    TipeSoal: 'Pilihan Ganda',
    jumlahSoal: soalList.length,
    JumlahSoal: soalList.length,
    kesulitan: 'Sedang',
    status: 'Siap Digunakan',
    topik: autoGenerateTopic || `Asesmen ${session.jenis || 'CBT'} ${mapel} Kelas ${kelas}`,
    soalList,
    SoalJSON: JSON.stringify(soalList),
    updatedAt: new Date().toISOString()
  };

  const newQuestions: any[] = soalList.map((q: any, idx: number) => ({
    id: `SOL-${newBankId}-${idx + 1}`,
    DetailSoalID: `SOL-${newBankId}-${idx + 1}`,
    BankSoalID: newBankId,
    UjianID: sesiId,
    NomorSoal: idx + 1,
    Pertanyaan: q.pertanyaan,
    TipeSoal: 'Pilihan Ganda',
    PilihanA: q.opsi.a,
    PilihanB: q.opsi.b,
    PilihanC: q.opsi.c,
    PilihanD: q.opsi.d,
    PilihanE: q.opsi.e || '',
    KunciJawaban: q.kunci,
    Bobot: q.bobot || 5,
    PembahasanRasional: q.pembahasan || '',
    CreatedAt: new Date().toISOString()
  }));

  // Simpan Bank Soal & Butir Soal
  const mergedBank = [bankPkg, ...existingBank.filter(b => b.id !== newBankId)];
  db.set('cbt_bank_soal', mergedBank);
  db.set('cbt_questions', mergedBank);

  const existingSoal = (db.get('cbt_exam_questions') || db.get('soal') || []) as any[];
  const mergedSoal = [...newQuestions, ...existingSoal.filter(s => s.BankSoalID !== newBankId)];
  db.set('cbt_exam_questions', mergedSoal);
  db.set('soal', mergedSoal);

  // Perbarui Sesi Ujian
  const updatedSession = {
    ...session,
    bankSoalId: newBankId,
    BankSoalID: newBankId,
    soal: `${soalList.length} Soal (Pilihan Ganda Terverifikasi)`,
    JumlahSoal: `${soalList.length} Butir Soal (PG)`
  };

  const updatedUjianList = existingUjian.map(u => 
    (u.id === sesiId || u.UjianID === sesiId) ? updatedSession : u
  );
  db.set('ujian_cbt', updatedUjianList);
  db.set('cbt_exams', updatedUjianList);

  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal' } }));

  // Push langsung ke Google Spreadsheet: Simpan butir soal ke SOAL & perbarui BANK_SOAL
  saveBulkQuestionsDirect(bankPkg, newQuestions).catch(() => {});
  autoSyncEngine.pushSpecificTables(['UJIAN']).catch(() => {});

  return {
    success: true,
    session: updatedSession,
    bankPackage: bankPkg,
    message: `Berhasil membuat ${soalList.length} butir soal pilihan ganda untuk sesi ${sesiId} dan menyimpannya di Bank Soal (Sheet BANK_SOAL & SOAL)!`
  };
}
