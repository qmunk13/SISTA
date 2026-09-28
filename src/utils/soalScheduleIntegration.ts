import { db } from '../data/db';
import { 
  generate20SoalPilihanGanda, 
  type BankSoalPackage, 
  type SoalPilihanGanda,
  cleanConceptName
} from '../data/soalGenerator';
import { autoSyncEngine } from '../data/autoSyncEngine';
import { deduplicateUjianSessions } from './cbtScheduleSync';

/**
 * Topik tematik Kurikulum Merdeka per Mata Pelajaran untuk STS Ganjil
 */
const STS_TOPIC_DEFAULTS: Record<string, string> = {
  'Ujian Praktek': 'Praktek Portofolio Karya & Unjuk Kerja Vokasi Terapan',
  'Ujian Vokasi': 'Uji Keterampilan Vokasional & Kewirausahaan Kreatif',
  'Pendidikan Agama dan Budi Pekerti': 'Nilai Keimanan, Akhlakul Karimah & Sikap Toleransi Keberagaman',
  'Pendidikan Pancasila / Kewarganegaraan': 'Penerapan Sila Pancasila, Norma Hukum & Gotong Royong Warga',
  'Bahasa Indonesia': 'Pemahaman Literasi Teks Narasi, Eksplanasi & Tata Kosakata Efektif',
  'Matematika': 'Operasi Hitung Bilangan, Penalaran Pecahan, Aljabar & Geometri Bangun',
  'Ilmu Pengetahuan Alam': 'Sistem Organ Tubuh, Rantai Makanan & Keseimbangan Ekosistem Hayati',
  'Ilmu Pengetahuan Sosial': 'Karakteristik Wilayah Geografis, Sejarah Lokal & Interaksi Sosial Budaya',
  'Pendidikan Jasmani Olahraga dan Kesehatan': 'Teknik Gerak Dasar Permainan Bola, Kebugaran Jasmani & Pola Hidup Sehat',
  'Seni Budaya': 'Apresiasi Seni Rupa Nusantara, Komposisi Motif Batik & Melodi Musik Tradisi',
  'Bahasa Inggris': 'Reading Comprehension, Descriptive Contextual Texts & Functional Expressions',
  'Pendidikan Lingkungan dan Budaya Jakarta': 'Cagar Budaya Betawi, Kuliner Khas Daerah & Kelestarian Lingkungan Kota Jakarta',
  'Baca Tulis': 'Kemahiran Membaca Nyaring, Menulis Huruf Tegak Bersambung & Memahami Intisari Bacaan',
  'Teknologi Informasi dan Komunikasi': 'Pengenalan Perangkat Komputer, Berpikir Komputasional & Etika Berinternet Positif',
  'Prakarya': 'Kerajinan Bahan Alam, Rekayasa Teknologi Sederhana & Kewirausahaan Mandiri',
  'Pemberdayaan': 'Kemandirian Komunitas, Pengelolaan Potensi Lokal & Kewirausahaan Sosial',
  'Sejarah': 'Kronik Peristiwa Kebangsaan, Tokoh Pejuang & Makna Proklamasi Kemerdekaan',
  'Sejarah Indonesia': 'Perjalanan Pergerakan Nasional & Diplomasi Mempertahankan Kemerdekaan',
  'Geografi': 'Analisis Peta Spasial, Lapisan Litosfer & Mitigasi Penanggulangan Bencana',
  'Ekonomi': 'Prinsip Motif Ekonomi, Keseimbangan Pasar & Pengelolaan Keuangan Pribadi',
  'Sosiologi': 'Struktur Stratifikasi Sosial, Harmoni Hubungan Antarkelompok & Solusi Masalah Kemasyarakatan'
};

/**
 * Menghasilkan Paket 20 Soal Pilihan Ganda resmi untuk satu sesi ujian tertentu
 */
export function buildSoalPackageForSession(session: {
  id: string;
  mapel: string;
  kelas: string;
  semester?: string;
  tahunAjaran?: string;
  pengawas?: string;
  durasi?: number | string;
  durasiMenit?: number | string;
  Durasi?: number | string;
  DurasiMenit?: number | string;
  [key: string]: any;
}): { pkg: BankSoalPackage; individualRows: any[] } {
  const mapelClean = session.mapel || 'Mata Pelajaran';
  const kelasStr = String(session.kelas || '4');
  const kelasNumeric = kelasStr.replace(/\D/g, '') || '4';
  
  // Tentukan Jenjang
  let paket = 'A';
  let jenjang = 'Paket A';
  const kNum = Number(kelasNumeric);
  if (kNum >= 10 || kelasStr.toLowerCase().includes('paket c') || kelasStr.includes('10') || kelasStr.includes('11') || kelasStr.includes('12')) {
    paket = 'C';
    jenjang = 'Paket C';
  } else if (kNum >= 7 || kelasStr.toLowerCase().includes('paket b') || kelasStr.includes('7') || kelasStr.includes('8') || kelasStr.includes('9')) {
    paket = 'B';
    jenjang = 'Paket B';
  }

  const topicName = STS_TOPIC_DEFAULTS[mapelClean] || cleanConceptName(`Materi Pokok ${mapelClean}`);
  const packageId = `BNK-STS-${session.id.replace(/^SES-/, '')}`;

  // Generate 20 soal PG berkualitas tanpa meta-phrasing
  const soalList: SoalPilihanGanda[] = generate20SoalPilihanGanda({
    mapel: mapelClean,
    topik: topicName,
    tema: `Asesmen Sumatif Tengah Semester (STS) Ganjil T.A 2026/2027`,
    kelas: kelasNumeric,
    paket
  });

  const pkg: BankSoalPackage = {
    id: packageId,
    BankSoalID: packageId,
    mapel: mapelClean,
    Mapel: mapelClean,
    kelas: kelasStr,
    Kelas: kelasStr,
    kurikulum: 'Kurikulum Merdeka',
    Kurikulum: 'Kurikulum Merdeka',
    guru: session.pengawas || 'Tim Pengampu Mapel',
    Guru: session.pengawas || 'Tim Pengampu Mapel',
    jumlahSoal: soalList.length,
    JumlahSoal: soalList.length,
    tipeSoal: `${soalList.length} Pilihan Ganda (Auto-Grading)`,
    TipeSoal: `${soalList.length} Pilihan Ganda (Auto-Grading)`,
    kesulitan: 'Mudah (30%), Sedang (50%), Sukar (20%)',
    Kesulitan: 'Mudah (30%), Sedang (50%), Sukar (20%)',
    status: 'Siap Digunakan',
    Status: 'Siap Digunakan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    topik: topicName,
    temaModul: `Modul STS Ganjil 2026/2027 (${jenjang})`,
    kodeSubTugas: `STS-26-${session.id}`,
    durasi: parseInt(String(session.durasi || session.durasiMenit || session.Durasi || session.DurasiMenit || '30').replace(/\D/g, ''), 10) || 30,
    Durasi: parseInt(String(session.durasi || session.durasiMenit || session.Durasi || session.DurasiMenit || '30').replace(/\D/g, ''), 10) || 30,
    durasiMenit: parseInt(String(session.durasi || session.durasiMenit || session.Durasi || session.DurasiMenit || '30').replace(/\D/g, ''), 10) || 30,
    soalList
  };

  // Canonical rows for sheet SOAL / cbt_exam_questions
  const individualRows = soalList.map((q, idx) => {
    const detailId = `SOAL-${pkg.id}-${q.id || idx + 1}`;
    const imgUrl = (q as any).gambar || (q as any).gambarUrl || (q as any).imageUrl || '';
    return {
      id: detailId,
      DetailSoalID: detailId,
      ujianId: session.id,
      UjianID: session.id,
      bankSoalId: pkg.id,
      BankSoalID: pkg.id,
      nomorSoal: q.id || idx + 1,
      NomorSoal: q.id || idx + 1,
      mapel: mapelClean,
      Mapel: mapelClean,
      MataPelajaran: mapelClean,
      'Mata Pelajaran': mapelClean,
      kelas: kelasStr,
      Kelas: kelasStr,
      jenjang,
      Jenjang: jenjang,
      tipe: q.tipe || 'Pilihan Ganda',
      Tipe: q.tipe || 'Pilihan Ganda',
      pertanyaan: q.pertanyaan,
      Pertanyaan: q.pertanyaan,
      opsiA: q.opsi?.a || '',
      PilihanA: q.opsi?.a || '',
      opsiB: q.opsi?.b || '',
      PilihanB: q.opsi?.b || '',
      opsiC: q.opsi?.c || '',
      PilihanC: q.opsi?.c || '',
      opsiD: q.opsi?.d || '',
      PilihanD: q.opsi?.d || '',
      opsiE: q.opsi?.e || '',
      PilihanE: q.opsi?.e || '',
      kunci: String(q.kunci || 'a').toLowerCase(),
      KunciJawaban: String(q.kunci || 'a').toLowerCase(),
      bobot: q.bobot || 5,
      Bobot: q.bobot || 5,
      pembahasan: q.pembahasan || '',
      PembahasanRasional: q.pembahasan || '',
      gambar: imgUrl,
      Gambar: imgUrl,
      LinkGambar: imgUrl,
      'Link Gambar': imgUrl,
      createdAt: new Date().toISOString()
    };
  });

  return { pkg, individualRows };
}

/**
 * Buat Soal dan Integrasikan ke satu Sesi Ujian di Jadwal
 */
export function generateAndIntegrateSoalForSession(session: any): {
  success: boolean;
  packageItem: BankSoalPackage;
  updatedSession: any;
} {
  const { pkg, individualRows } = buildSoalPackageForSession(session);

  // 1. Simpan Paket Soal ke cbt_bank_soal & BANK_SOAL
  const existingBank = (db.get('cbt_bank_soal') as any[]) || [];
  const filteredBank = existingBank.filter((b: any) => (b.id || b.BankSoalID) !== pkg.id);
  const updatedBank = [pkg, ...filteredBank];
  db.set('cbt_bank_soal', updatedBank);
  db.set('cbt_questions', updatedBank);
  db.set('BANK_SOAL', updatedBank);

  // 2. Simpan Butir Soal Individual ke cbt_exam_questions & SOAL
  const existingQuestions = (db.get('cbt_exam_questions') as any[]) || [];
  const filteredQuestions = existingQuestions.filter((q: any) => q.bankSoalId !== pkg.id && q.ujianId !== session.id);
  const updatedQuestions = [...individualRows, ...filteredQuestions];
  db.set('cbt_exam_questions', updatedQuestions);
  db.set('soal', updatedQuestions);
  db.set('SOAL', updatedQuestions);

  // 3. Update Sesi Ujian di ujian_cbt & cbt_exams dengan menghubungkan bankSoalId & soalList
  const rawUjian = (db.get('ujian_cbt') as any[]) || [];
  let found = false;
  const updatedUjian = rawUjian.map((u: any) => {
    const uId = u.id || u.UjianID || u.ujianId || u.sesiId;
    if (uId === session.id) {
      found = true;
      return {
        ...u,
        id: session.id,
        UjianID: session.id,
        bankSoalId: pkg.id,
        BankSoalID: pkg.id,
        soal: `${pkg.soalList.length} Soal PG (Terkunci & Siap Ujian)`,
        soalList: pkg.soalList,
        jumlahSoal: pkg.soalList.length
      };
    }
    return u;
  });

  if (!found) {
    updatedUjian.unshift({
      ...session,
      id: session.id,
      UjianID: session.id,
      bankSoalId: pkg.id,
      BankSoalID: pkg.id,
      soal: `${pkg.soalList.length} Soal PG (Terkunci & Siap Ujian)`,
      soalList: pkg.soalList,
      jumlahSoal: pkg.soalList.length
    });
  }

  const finalUpdatedUjian = deduplicateUjianSessions(updatedUjian);
  db.set('ujian_cbt', finalUpdatedUjian);
  db.set('cbt_exams', finalUpdatedUjian);

  // 4. Update Jadwal Ujian CBT (Bukan Jadwal Pelajaran Mingguan KBM)
  const rawSchedules = (db.get('cbt_schedules') || db.get('jadwal_ujian') || []) as any[];
  const updatedSchedules = rawSchedules.map((sch: any) => {
    if (sch.UjianID === session.id || sch.id === session.id || sch.Token === session.token) {
      return {
        ...sch,
        bankSoalId: pkg.id,
        soal: `${pkg.soalList.length} Soal PG`,
        statusSoal: 'Siap Ujian'
      };
    }
    return sch;
  });
  db.set('cbt_schedules', updatedSchedules);
  db.set('jadwal_ujian', updatedSchedules);

  // 5. Trigger event refresh
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_questions' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_schedules' } }));

  // 6. Push to Google Sheet queue
  try {
    autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL', 'UJIAN', 'CBT_UJIAN', 'JADWAL']).catch(() => {});
  } catch (e) {
    console.warn('AutoSync trigger error:', e);
  }

  return {
    success: true,
    packageItem: pkg,
    updatedSession: updatedUjian.find((u: any) => u.id === session.id) || session
  };
}

/**
 * Hubungkan Bank Soal yang sudah ada ke satu Sesi Ujian di Jadwal
 */
export function linkBankSoalToSession(bankSoalId: string, sesiId: string): boolean {
  const existingBank = (db.get('cbt_bank_soal') as any[]) || [];
  const matchedBank = existingBank.find((b: any) => (b.id || b.BankSoalID) === bankSoalId);
  if (!matchedBank) return false;

  const rawUjian = (db.get('ujian_cbt') as any[]) || [];
  const updatedUjian = rawUjian.map((u: any) => {
    const uId = u.id || u.UjianID || u.ujianId || u.sesiId;
    if (uId === sesiId) {
      const qCount = matchedBank.soalList?.length || matchedBank.jumlahSoal || 20;
      return {
        ...u,
        id: sesiId,
        UjianID: sesiId,
        bankSoalId,
        BankSoalID: bankSoalId,
        soal: `${qCount} Soal PG (Terhubung)`,
        soalList: matchedBank.soalList || [],
        jumlahSoal: qCount
      };
    }
    return u;
  });
  const cleanUjian = deduplicateUjianSessions(updatedUjian);
  db.set('ujian_cbt', cleanUjian);
  db.set('cbt_exams', cleanUjian);

  // Update Schedules Ujian CBT
  const rawSchedules = (db.get('cbt_schedules') || db.get('jadwal_ujian') || []) as any[];
  const updatedSchedules = rawSchedules.map((sch: any) => {
    if (sch.UjianID === sesiId || sch.id === sesiId) {
      return {
        ...sch,
        bankSoalId,
        soal: `${matchedBank.soalList?.length || 20} Soal PG`,
        statusSoal: 'Siap Ujian'
      };
    }
    return sch;
  });
  db.set('cbt_schedules', updatedSchedules);
  db.set('jadwal_ujian', updatedSchedules);

  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_schedules' } }));

  try {
    autoSyncEngine.pushSpecificTables(['UJIAN', 'CBT_UJIAN', 'BANK_SOAL', 'SOAL', 'JADWAL']).catch(() => {});
  } catch (e) {
    console.warn(e);
  }

  return true;
}

/**
 * Otomatis Buat Soal & Integrasikan ke SEMUA Sesi Jadwal Ujian yang belum punya bank soal
 */
export function autoGenerateAndIntegrateAllSessions(sessions: any[], onProgress?: (current: number, total: number, name: string) => void): {
  totalGenerated: number;
  totalLinked: number;
  packages: BankSoalPackage[];
} {
  const existingBank = (db.get('cbt_bank_soal') as any[]) || [];
  const existingBankMap = new Map<string, any>();
  existingBank.forEach((b: any) => {
    const id = b.id || b.BankSoalID;
    if (id) existingBankMap.set(id, b);
  });

  const newPackages: BankSoalPackage[] = [];
  const allIndividualRows: any[] = [];
  const rawUjian = (db.get('ujian_cbt') as any[]) || [];
  const ujianMap = new Map<string, any>();
  rawUjian.forEach((u: any) => {
    const uId = u.id || u.UjianID || u.ujianId || u.sesiId;
    if (uId) ujianMap.set(uId, { ...u, id: uId, UjianID: uId });
  });

  let generatedCount = 0;
  let linkedCount = 0;

  sessions.forEach((sesi, idx) => {
    if (onProgress) {
      onProgress(idx + 1, sessions.length, `${sesi.mapel} - ${sesi.kelas}`);
    }

    const expectedBankId = `BNK-STS-${sesi.id.replace(/^SES-/, '')}`;
    let pkg = existingBankMap.get(sesi.bankSoalId) || existingBankMap.get(expectedBankId);

    if (!pkg) {
      // Buat paket baru
      const { pkg: createdPkg, individualRows } = buildSoalPackageForSession(sesi);
      pkg = createdPkg;
      newPackages.push(createdPkg);
      allIndividualRows.push(...individualRows);
      existingBankMap.set(createdPkg.id, createdPkg);
      generatedCount++;
    }

    // Hubungkan ke sesi ujian
    const curUjian = ujianMap.get(sesi.id) || sesi;
    ujianMap.set(sesi.id, {
      ...curUjian,
      bankSoalId: pkg.id,
      BankSoalID: pkg.id,
      soal: `${pkg.soalList?.length || 20} Soal PG (Terkunci & Siap Ujian)`,
      soalList: pkg.soalList || [],
      jumlahSoal: pkg.soalList?.length || 20
    });
    linkedCount++;
  });

  // Simpan akumulatif
  if (newPackages.length > 0) {
    const combinedBank = [...newPackages, ...existingBank.filter(b => !newPackages.some(np => np.id === b.id))];
    db.set('cbt_bank_soal', combinedBank);
    db.set('cbt_questions', combinedBank);
    db.set('BANK_SOAL', combinedBank);

    const existingQuestions = (db.get('cbt_exam_questions') as any[]) || [];
    const combinedQuestions = [...allIndividualRows, ...existingQuestions];
    db.set('cbt_exam_questions', combinedQuestions);
    db.set('soal', combinedQuestions);
    db.set('SOAL', combinedQuestions);
  }

  // Update ujian_cbt
  const updatedUjianList = deduplicateUjianSessions(Array.from(ujianMap.values()));
  db.set('ujian_cbt', updatedUjianList);
  db.set('cbt_exams', updatedUjianList);

  // Update schedules Ujian CBT
  const rawSchedules = (db.get('cbt_schedules') || db.get('jadwal_ujian') || []) as any[];
  const updatedSchedules = rawSchedules.map((sch: any) => {
    const matchedUjian = ujianMap.get(sch.UjianID || sch.id);
    if (matchedUjian) {
      return {
        ...sch,
        bankSoalId: matchedUjian.bankSoalId,
        soal: matchedUjian.soal,
        statusSoal: 'Siap Ujian'
      };
    }
    return sch;
  });
  db.set('cbt_schedules', updatedSchedules);
  db.set('jadwal_ujian', updatedSchedules);

  // Notify listeners
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_questions' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_schedules' } }));

  try {
    autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL', 'UJIAN', 'CBT_UJIAN', 'JADWAL']).catch(() => {});
  } catch (e) {
    console.warn(e);
  }

  return {
    totalGenerated: generatedCount,
    totalLinked: linkedCount,
    packages: newPackages
  };
}

/**
 * Menyimpan butir-butir soal buatan guru secara langsung untuk satu sesi jadwal ujian tertentu
 */
export function saveCustomQuestionsForSession(
  session: any, 
  newQuestions: SoalPilihanGanda[]
): {
  success: boolean;
  packageItem: BankSoalPackage;
  updatedSession: any;
} {
  const mapelClean = session.mapel || 'Mata Pelajaran';
  const kelasStr = String(session.kelas || '4');
  const packageId = session.bankSoalId || `BNK-JADWAL-${String(session.id || Date.now()).replace(/^SES-/, '')}`;
  
  // Ambil data paket yang sudah ada jika ada, atau buat baru
  const existingBank = (db.get('cbt_bank_soal') as any[]) || [];
  const currentPkg = existingBank.find((b: any) => (b.id || b.BankSoalID) === packageId);

  const sessionDuration = parseInt(String(session.durasi || session.durasiMenit || session.Durasi || session.DurasiMenit || currentPkg?.durasi || currentPkg?.Durasi || '30').replace(/\D/g, ''), 10) || 30;

  const pkg: BankSoalPackage = {
    id: packageId,
    BankSoalID: packageId,
    mapel: mapelClean,
    Mapel: mapelClean,
    kelas: kelasStr,
    Kelas: kelasStr,
    kurikulum: currentPkg?.kurikulum || 'Kurikulum Merdeka',
    Kurikulum: currentPkg?.Kurikulum || 'Kurikulum Merdeka',
    guru: session.pengawas || currentPkg?.guru || 'Guru Pengampu',
    Guru: session.pengawas || currentPkg?.Guru || 'Guru Pengampu',
    jumlahSoal: newQuestions.length,
    JumlahSoal: newQuestions.length,
    tipeSoal: `${newQuestions.length} Pilihan Ganda`,
    TipeSoal: `${newQuestions.length} Pilihan Ganda`,
    kesulitan: currentPkg?.kesulitan || 'Standar Guru',
    Kesulitan: currentPkg?.Kesulitan || 'Standar Guru',
    status: 'Siap Digunakan',
    Status: 'Siap Digunakan',
    createdAt: currentPkg?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    topik: currentPkg?.topik || `Ujian ${mapelClean} Sesi ${session.id}`,
    temaModul: currentPkg?.temaModul || `Soal Mandiri Sesi ${session.id}`,
    kodeSubTugas: currentPkg?.kodeSubTugas || `JADWAL-${session.id}`,
    durasi: sessionDuration,
    Durasi: sessionDuration,
    durasiMenit: sessionDuration,
    soalList: newQuestions
  };

  // 1. Simpan ke cbt_bank_soal & BANK_SOAL
  const filteredBank = existingBank.filter((b: any) => (b.id || b.BankSoalID) !== pkg.id);
  const updatedBank = [pkg, ...filteredBank];
  db.set('cbt_bank_soal', updatedBank);
  db.set('cbt_questions', updatedBank);
  db.set('BANK_SOAL', updatedBank);

  // 2. Simpan individual rows ke cbt_exam_questions & SOAL
  const individualRows = newQuestions.map((q, idx) => {
    const detailId = `SOAL-${pkg.id}-${q.id || idx + 1}`;
    const opsiObj = q.opsi || {} as any;
    const imgUrl = (q as any).gambar || (q as any).gambarUrl || (q as any).imageUrl || '';
    return {
      id: detailId,
      DetailSoalID: detailId,
      ujianId: session.id,
      UjianID: session.id,
      bankSoalId: pkg.id,
      BankSoalID: pkg.id,
      nomorSoal: q.id || idx + 1,
      NomorSoal: q.id || idx + 1,
      mapel: mapelClean,
      Mapel: mapelClean,
      MataPelajaran: mapelClean,
      'Mata Pelajaran': mapelClean,
      kelas: kelasStr,
      Kelas: kelasStr,
      tipe: q.tipe || 'Pilihan Ganda',
      Tipe: q.tipe || 'Pilihan Ganda',
      pertanyaan: q.pertanyaan,
      Pertanyaan: q.pertanyaan,
      opsiA: opsiObj.a || (typeof opsiObj === 'object' && opsiObj['0']?.text) || '',
      PilihanA: opsiObj.a || (typeof opsiObj === 'object' && opsiObj['0']?.text) || '',
      opsiB: opsiObj.b || (typeof opsiObj === 'object' && opsiObj['1']?.text) || '',
      PilihanB: opsiObj.b || (typeof opsiObj === 'object' && opsiObj['1']?.text) || '',
      opsiC: opsiObj.c || (typeof opsiObj === 'object' && opsiObj['2']?.text) || '',
      PilihanC: opsiObj.c || (typeof opsiObj === 'object' && opsiObj['2']?.text) || '',
      opsiD: opsiObj.d || (typeof opsiObj === 'object' && opsiObj['3']?.text) || '',
      PilihanD: opsiObj.d || (typeof opsiObj === 'object' && opsiObj['3']?.text) || '',
      opsiE: opsiObj.e || (typeof opsiObj === 'object' && opsiObj['4']?.text) || '',
      PilihanE: opsiObj.e || (typeof opsiObj === 'object' && opsiObj['4']?.text) || '',
      opsi: q.opsi,
      kunci: String(q.kunci || 'a').toLowerCase(),
      KunciJawaban: String(q.kunci || 'a').toLowerCase(),
      bobot: q.bobot || 5,
      Bobot: q.bobot || 5,
      pembahasan: q.pembahasan || '',
      PembahasanRasional: q.pembahasan || '',
      gambar: imgUrl,
      Gambar: imgUrl,
      LinkGambar: imgUrl,
      'Link Gambar': imgUrl,
      createdAt: new Date().toISOString()
    };
  });

  const existingQuestions = (db.get('cbt_exam_questions') as any[]) || [];
  const filteredQuestions = existingQuestions.filter((q: any) => q.bankSoalId !== pkg.id && q.ujianId !== session.id);
  const updatedQuestions = [...individualRows, ...filteredQuestions];
  db.set('cbt_exam_questions', updatedQuestions);
  db.set('soal', updatedQuestions);
  db.set('SOAL', updatedQuestions);

  // 3. Update Sesi Ujian di ujian_cbt & cbt_exams
  const rawUjian = (db.get('ujian_cbt') as any[]) || [];
  let found = false;
  const updatedUjian = rawUjian.map((u: any) => {
    const uId = u.id || u.UjianID || u.ujianId || u.sesiId;
    if (uId === session.id) {
      found = true;
      return {
        ...u,
        id: session.id,
        UjianID: session.id,
        bankSoalId: pkg.id,
        BankSoalID: pkg.id,
        soal: `${newQuestions.length} Soal PG (Mandiri Guru)`,
        soalList: newQuestions,
        jumlahSoal: newQuestions.length
      };
    }
    return u;
  });

  if (!found) {
    updatedUjian.unshift({
      ...session,
      id: session.id,
      UjianID: session.id,
      bankSoalId: pkg.id,
      BankSoalID: pkg.id,
      soal: `${newQuestions.length} Soal PG (Mandiri Guru)`,
      soalList: newQuestions,
      jumlahSoal: newQuestions.length
    });
  }

  const finalUpdatedUjian = deduplicateUjianSessions(updatedUjian);
  db.set('ujian_cbt', finalUpdatedUjian);
  db.set('cbt_exams', finalUpdatedUjian);

  // 4. Update Jadwal Ujian
  const rawSchedules = (db.get('cbt_schedules') || db.get('jadwal_ujian') || []) as any[];
  const updatedSchedules = rawSchedules.map((sch: any) => {
    if (sch.UjianID === session.id || sch.id === session.id || sch.Token === session.token) {
      return {
        ...sch,
        bankSoalId: pkg.id,
        soal: `${newQuestions.length} Soal PG`,
        statusSoal: newQuestions.length > 0 ? 'Siap Ujian' : 'Belum Ada Soal'
      };
    }
    return sch;
  });
  db.set('cbt_schedules', updatedSchedules);
  db.set('jadwal_ujian', updatedSchedules);

  // 5. Trigger update events
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_bank_soal' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_questions' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_schedules' } }));

  try {
    autoSyncEngine.pushSpecificTables(['BANK_SOAL', 'SOAL', 'UJIAN', 'CBT_UJIAN', 'JADWAL']).catch(() => {});
  } catch (e) {
    console.warn(e);
  }

  return {
    success: true,
    packageItem: pkg,
    updatedSession: updatedUjian.find((u: any) => u.id === session.id) || session
  };
}

