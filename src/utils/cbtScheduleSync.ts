import { db } from '../data/db';
import { autoSyncEngine } from '../data/autoSyncEngine';
import { formatClockTime } from '../lib/utils';
import { generateJadwalItemsFromMaster } from '../data/masterJadwalData';
import { JADWAL_STS_GANJIL_2026 } from '../data/jadwalStsGanjil2026';

function normalizeExamDateWib(raw: any): string {
  const str = String(raw || '').trim();
  if (!str) return '2026-09-28';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      return wib.toISOString().slice(0, 10);
    }
  }
  return str;
}

/**
 * Deduplikasi sesi ujian CBT untuk mencegah double counting
 * dan memastikan tepat 114 Sesi Ujian STS Resmi murni dari Google Spreadsheet (membuang sesi berlebih / dummy / baris rusak).
 */
export function deduplicateUjianSessions(list: any[]): any[] {
  if (!Array.isArray(list) || list.length === 0) {
    return [];
  }
  const seenIds = new Set<string>();
  const seenMapelKelas = new Set<string>();
  const result: any[] = [];

  for (const item of list) {
    if (!item) continue;
    const rawId = String(item.id || item.UjianID || item.ujianId || item.sesiId || '').trim();
    const id = rawId.startsWith('JDW-STS-26-')
      ? String(item.UjianID || item.idUjian || rawId.replace(/^JDW-/, 'SES-')).trim()
      : rawId;

    if (id.startsWith('SIM-') || item.isSimulation || item.isDummy) {
      continue;
    }

    const rawMapel = String(item.mapel || item.Mapel || item.namaUjian || item.NamaUjian || '').trim();
    const rawKelas = String(item.kelas || item.Kelas || '').trim();
    const rawTgl = String(item.tgl || item.tanggal || item.Tanggal || item.tglDisplay || '').trim();
    const rawToken = String(item.token || item.Token || '').trim();
    const rawStatus = String(item.status || item.Status || '').trim();

    // Filter out corrupted CSV-shifted rows (e.g., SES-STS-26-115..117 where Kelas='Paket A (Kls 4', Tanggal='6)', Token='TIDAK', Status='YA')
    if (
      !rawMapel ||
      !rawKelas ||
      rawToken.toUpperCase() === 'TIDAK' ||
      rawStatus.toUpperCase() === 'YA' ||
      rawKelas.includes('(') ||
      rawTgl.endsWith(')') ||
      rawTgl.includes('10-01') ||
      rawTgl.includes('01 Okt') ||
      rawTgl.includes('2026-10-01')
    ) {
      continue;
    }

    const cleanMapelKey = rawMapel.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanKelasKey = rawKelas.toLowerCase().replace(/[^0-9a-z]/g, '');
    const mapelKelasKey = cleanMapelKey && cleanKelasKey ? `${cleanMapelKey}|${cleanKelasKey}` : '';

    if (id && seenIds.has(id)) {
      continue; // ID duplikat
    }
    if (mapelKelasKey && seenMapelKelas.has(mapelKelasKey)) {
      continue; // Kombinasi Mapel & Kelas sudah ada (menjamin tepat 1 sesi per Mapel & Kelas = 114 sesi)
    }

    if (id) seenIds.add(id);
    if (mapelKelasKey) seenMapelKelas.add(mapelKelasKey);

    const normalizedTgl = normalizeExamDateWib(item.tgl || item.tanggal || item.Tanggal || item.tglDisplay);
    const jenis = String(item.jenis || item.Jenis || item.JenisUjian || item.jenisUjian || 'Sumatif Tengah Semester (STS)').trim();
    const durasi = String(item.durasi || item.Durasi || (item.durasiMenit ? `${item.durasiMenit} Menit` : '90 Menit')).trim();
    const durasiMenit = Number(String(item.durasiMenit || durasi).replace(/\D/g, '')) || 90;
    const proktor = String(item.proktor || item.Proktor || item.pengawas || item.Pengawas || 'Guru Kelas').trim();
    const soal = String(item.soal || item.Soal || item.jumlahSoal || item.JumlahSoal || '30 Butir Soal (PG)').trim();
    const peserta = item.peserta !== undefined ? item.peserta : (item.Peserta !== undefined ? item.Peserta : 0);
    const namaUjian = String(item.namaUjian || item.NamaUjian || rawMapel || 'Ujian').trim();

    result.push({
      ...item,
      id: id || item.id,
      UjianID: id || item.UjianID || item.id,
      mapel: rawMapel,
      Mapel: rawMapel,
      namaUjian,
      NamaUjian: namaUjian,
      kelas: rawKelas,
      Kelas: rawKelas,
      tgl: normalizedTgl,
      tanggal: normalizedTgl,
      jamMulai: formatClockTime(item.jamMulai || item.JamMulai, '19:30'),
      jamSelesai: formatClockTime(item.jamSelesai || item.JamSelesai, '22:00'),
      token: rawToken,
      status: rawStatus || 'Terjadwal',
      jenis,
      Jenis: jenis,
      JenisUjian: jenis,
      jenisUjian: jenis,
      durasi,
      Durasi: durasi,
      durasiMenit,
      proktor,
      Proktor: proktor,
      pengawas: proktor,
      soal,
      Soal: soal,
      jumlahSoal: soal,
      peserta,
      Peserta: peserta,
      bankSoalId: item.bankSoalId || item.BankSoalID || undefined,
      BankSoalID: item.BankSoalID || item.bankSoalId || undefined,
      soalList: Array.isArray(item.soalList) ? item.soalList : undefined,
      avg: Number(item.avg ?? item.Avg ?? 0) || 0,
      semester: item.semester || item.Semester || 'Ganjil',
      tahunAjaran: item.tahunAjaran || item.TahunAjaran || '2026/2027',
      acakSoal: item.acakSoal !== undefined ? item.acakSoal : (String(item.AcakSoal || '').toLowerCase() === 'ya' || item.AcakSoal === true),
      acakOpsi: item.acakOpsi !== undefined ? item.acakOpsi : (String(item.AcakOpsi || '').toLowerCase() === 'ya' || item.AcakOpsi === true),
      tampilkanNilai: item.tampilkanNilai !== undefined ? item.tampilkanNilai : (String(item.TampilkanNilai || '').toLowerCase() === 'ya' || item.TampilkanNilai === true)
    });
  }

  return result;
}

/**
 * Deduplikasi Token Riwayat Ujian
 */
export function deduplicateTokens(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: any[] = [];

  for (const item of list) {
    if (!item) continue;
    const rawSesi = String(item.sesiId || item.UjianID || item.ujianId || item.id || '').replace(/^tok-/, '').trim();
    const token = String(item.token || item.Token || '').trim();
    if (token.toUpperCase() === 'TIDAK') continue;
    const key = rawSesi || token;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    result.push({
      ...item,
      id: item.id || `tok-${rawSesi}`,
      sesiId: rawSesi || item.sesiId,
      UjianID: rawSesi || item.UjianID,
      token: item.token || item.Token,
      status: item.status || 'Aktif'
    });
  }
  return result;
}

/**
 * Menyinkronkan Sesi Ujian CBT ke:
 * 1. Modul CBT (ujian_cbt & cbt_exams)
 * 2. Token Ujian (cbt_token_history & cbt_tokens)
 * 3. Jadwal Ujian CBT (cbt_schedules, jadwal_ujian)
 * 4. Antrian Google Spreadsheet Sync (Sheet UJIAN & TOKEN)
 */
export function syncStsToAllSystems(customList?: any[]) {
  const rawUjian = db.get('ujian_cbt');
  const existingUjian = Array.isArray(rawUjian) ? rawUjian : [];
  const sourceList = customList && customList.length > 0 ? customList : existingUjian;

  // 1. Simpan ke CBT Exams (Dinamis sesuai seluruh jadwal yang ada)
  const fullUjian = deduplicateUjianSessions(sourceList);
  db.set('ujian_cbt', fullUjian);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt' } }));
  }

  // 2. Simpan ke Token History (1 Token per 1 Sesi)
  const sessionTokens = fullUjian.map((item: any) => ({
    id: `tok-${item.id || item.UjianID}`,
    sesiId: item.id || item.UjianID,
    UjianID: item.id || item.UjianID,
    mapel: item.mapel || item.Mapel,
    kelas: item.kelas || item.Kelas,
    token: item.token || item.Token,
    waktuDibuat: '19:30 WIB',
    kedaluwarsa: `${item.tglDisplay || item.tgl || ''}, 22:00 WIB`,
    status: 'Aktif' as const,
    proktor: item.pengawas || item.proktor || 'Guru Pengawas'
  }));
  const fullTokens = deduplicateTokens(sessionTokens);
  db.set('cbt_token_history', fullTokens);
  db.set('cbt_tokens', fullTokens);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_token_history' } }));
  }

  // 3. Simpan ke Jadwal Ujian CBT (Bukan Jadwal Pelajaran Mingguan!)
  // Jadwal Ujian bersifat insidental/berkala, terpisah dari Jadwal KBM Mingguan rutin 3x pertemuan
  const stsSchedules = sourceList.map((item, idx) => {
      let hari = 'Senin';
      try {
        const d = new Date(item.tgl);
        if (!isNaN(d.getTime())) {
          const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          hari = days[d.getDay()] || 'Senin';
        }
      } catch {}

    return {
      id: `JDW-STS-26-${String(idx + 1).padStart(3, '0')}`,
      JadwalID: `JDW-STS-26-${String(idx + 1).padStart(3, '0')}`,
      Hari: hari,
      hari: hari,
      Tanggal: item.tgl,
      tgl: item.tgl,
      tglDisplay: item.tglDisplay,
      JamMulai: item.jamMulai,
      jamMulai: item.jamMulai,
      JamSelesai: item.jamSelesai,
      jamSelesai: item.jamSelesai,
      Jam: `${item.jamMulai} - ${item.jamSelesai} WIB`,
      jam: `${item.jamMulai} - ${item.jamSelesai} WIB`,
      Kelas: item.kelas,
      kelas: item.kelas,
      NamaKelas: item.kelas,
      Mapel: item.mapel,
      mapel: item.mapel,
      NamaMapel: item.mapel,
      Guru: item.pengawas || 'Guru Pengampu / Proktor',
      guru: item.pengawas || 'Guru Pengampu / Proktor',
      NamaGuru: item.pengawas || 'Guru Pengampu / Proktor',
      Ruangan: `Ruang CBT (${item.kelas})`,
      ruang: `Ruang CBT (${item.kelas})`,
      TahunAjaran: '2026/2027',
      tahunAjaran: '2026/2027',
      Semester: 'Ganjil',
      semester: 'Ganjil',
      Status: item.status || 'Terjadwal',
      status: item.status || 'Terjadwal',
      Kategori: 'Ujian STS Ganjil',
      kategori: 'Ujian STS Ganjil',
      kategoriBelajar: 'Semua',
      Token: item.token,
      token: item.token,
      UjianID: item.id
    };
  });

  db.set('cbt_schedules', stsSchedules);
  db.set('jadwal_ujian', stsSchedules);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_schedules' } }));
  }

  // 4. Bersihkan Jadwal Pelajaran Mingguan dari kontaminasi jadwal ujian
  // Jadwal Mingguan KTCT Tambora secara ketat menganut Skema 3x Pertemuan Sinkron per Minggu (Senin, Rabu/Kamis, Minggu)
  const isExamItem = (item: any) => {
    if (!item) return false;
    const id = String(item.id || item.JadwalID || item.UjianID || '').toUpperCase();
    if (id.startsWith('JDW-STS-') || id.startsWith('SES-STS-') || id.startsWith('CBT-') || id.startsWith('UJIAN-')) return true;
    const kat = String(item.Kategori || item.kategori || '').toLowerCase();
    if (kat.includes('ujian') || kat.includes('cbt') || kat.includes('sts') || kat.includes('sas') || kat.includes('asesmen')) return true;
    const r = String(item.Ruang || item.ruang || item.Ruangan || '').toLowerCase();
    if (r.includes('ruang cbt') || r.includes('laboratorium cbt')) return true;
    if (item.Token || item.token || item.UjianID || item.ujianId) return true;
    return false;
  };

  const rawWeekly = (db.get('jadwal_rombel') || db.get('academic_schedules') || db.get('jadwal_pelajaran') || db.get('schedule') || []) as any[];
  let cleanWeekly = Array.isArray(rawWeekly) ? rawWeekly.filter((j: any) => !isExamItem(j)) : [];

  // Jika setelah dibersihkan jadwal mingguan kosong, pulihkan 27 Sesi Resmi KTCT Tambora
  if (!cleanWeekly || cleanWeekly.length === 0) {
    cleanWeekly = generateJadwalItemsFromMaster('2026/2027', 'Ganjil');
  }

  db.set('academic_schedules', cleanWeekly);
  db.set('jadwal_rombel', cleanWeekly);
  db.set('jadwal_pelajaran', cleanWeekly);
  db.set('schedule', cleanWeekly);
  db.set('jadwal', cleanWeekly);
  db.set('JADWAL', cleanWeekly);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'academic_schedules' } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'jadwal_rombel' } }));
  }

  // 5. Push ke Google Spreadsheet antrean tabel CBT
  try {
    autoSyncEngine.pushSpecificTables(['UJIAN', 'CBT_UJIAN', 'JADWAL_UJIAN', 'TOKEN', 'CBT_TOKEN', 'JADWAL']).catch(() => {});
  } catch (err) {
    console.warn('AutoSync push error:', err);
  }

  return { fullUjian, fullTokens, stsSchedules, cleanWeeklySchedules: cleanWeekly };
}
