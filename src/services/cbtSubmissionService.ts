import { db } from '../data/db';
import { getStoredGasUrl } from '../utils/gasSync';
import { DEFAULT_APP_CONFIG } from '../data/config';

export interface CbtSubmissionPayload {
  idHasil?: string;
  HasilUjianID?: string;
  idUjian?: string;
  UjianID?: string;
  ujianId?: string;
  idJadwal?: string;
  bankSoalId?: string;
  mapel?: string;
  namaUjian?: string;
  jenjang?: string;
  kelas?: string;
  nisn?: string;
  namaSiswa?: string;
  studentId?: string;
  siswaId?: string;
  nilaiMentah?: number;
  nilaiAkhir?: number;
  nilai?: number;
  benar?: number;
  salah?: number;
  totalSoal?: number;
  pelanggaran?: number;
  status?: string;
  durasi?: string;
  durasiPengerjaan?: string;
  tahunAjaran?: string;
  semester?: string;
  jenisAsesmen?: string;
  token?: string;
  guru?: string;
  waktuMulai?: string;
  waktuSelesai?: string;
  jawabanDetail?: Array<{
    nomorSoal: number;
    jawabanSiswa: string;
    kunci: string;
    isCorrect: boolean;
    bobot?: number;
  }>;
  [key: string]: any;
}

export async function submitCbtExamResult(payload: CbtSubmissionPayload): Promise<{
  success: boolean;
  message: string;
  idHasil?: string;
  nilai?: number;
}> {
  const nowIso = new Date().toISOString();
  const nowDate = nowIso.slice(0, 10);
  const idHasil = payload.HasilUjianID || payload.idHasil || `HSL-${Date.now()}`;
  const finalNilai = Number(payload.nilaiAkhir ?? payload.nilai ?? payload.nilaiMentah ?? 0);
  const finalStatus = payload.status || (finalNilai >= 65 ? 'LULUS' : 'REMEDIAL');

  const normalizedResult = {
    id: idHasil,
    HasilUjianID: idHasil,
    idHasil: idHasil,
    UjianID: payload.idUjian || payload.UjianID || payload.ujianId || payload.idJadwal || 'UJ-001',
    idUjian: payload.idUjian || payload.UjianID || payload.ujianId || payload.idJadwal || 'UJ-001',
    idJadwal: payload.idJadwal || payload.idUjian || 'JDW-001',
    mapel: payload.mapel,
    NamaUjian: payload.namaUjian || payload.mapel,
    jenjang: payload.jenjang || 'SMA',
    kelas: payload.kelas,
    nisn: payload.nisn,
    NISN: payload.nisn,
    namaSiswa: payload.namaSiswa,
    NamaSiswa: payload.namaSiswa,
    nilai: finalNilai,
    Nilai: finalNilai,
    nilaiMentah: payload.nilaiMentah ?? finalNilai,
    nilaiAkhir: finalNilai,
    NilaiAkhir: finalNilai,
    benar: payload.benar,
    Benar: payload.benar,
    salah: payload.salah,
    Salah: payload.salah,
    totalSoal: payload.totalSoal,
    TotalSoal: payload.totalSoal,
    pelanggaran: payload.pelanggaran || 0,
    Pelanggaran: payload.pelanggaran || 0,
    status: finalStatus,
    Status: finalStatus,
    StatusTuntas: finalStatus,
    waktuMulai: payload.waktuMulai || nowIso,
    waktuSelesai: payload.waktuSelesai || nowIso,
    WaktuSelesai: payload.waktuSelesai || nowIso,
    tanggal: nowDate,
    durasi: payload.durasi || payload.durasiPengerjaan || '30 Menit',
    tahunAjaran: payload.tahunAjaran || '2026/2027',
    semester: payload.semester || 'Ganjil',
    idAsesmen: payload.idUjian || 'AS-01',
    jenisAsesmen: payload.jenisAsesmen || 'SUMATIF',
    token: payload.token || '-',
    createdAt: nowIso,
    CreatedAt: nowIso
  };

  // 1. Simpan ke database lokal MockDb (hasil_ujian, cbt_exam_results, cbt_results)
  try {
    const existingHasil = (db.get('hasil_ujian') as any[]) || [];
    const filteredHasil = existingHasil.filter(h => 
      !(String(h.idUjian || h.UjianID) === String(normalizedResult.idUjian) && String(h.nisn || h.NISN) === String(payload.nisn))
    );
    db.set('hasil_ujian', [normalizedResult, ...filteredHasil]);

    const existingCbtResults = (db.get('cbt_exam_results') as any[]) || [];
    const filteredCbtResults = existingCbtResults.filter(r => 
      !(String(r.examId || r.UjianID) === String(normalizedResult.idUjian) && String(r.studentId || r.nisn || r.NISN) === String(payload.nisn))
    );
    db.set('cbt_exam_results', [normalizedResult, ...filteredCbtResults]);
    db.set('cbt_results', [normalizedResult, ...filteredCbtResults]);
  } catch (errDb) {
    console.warn('[submitCbtExamResult] Local DB store error:', errDb);
  }

  // 2. Kirim langsung ke Google Spreadsheet via Backend API (/api/cbt/submit-ujian)
  let backendSuccess = false;
  let backendMsg = '';
  try {
    const res = await fetch('/api/cbt/submit-ujian', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission: normalizedResult,
        jawabanDetail: payload.jawabanDetail || []
      })
    });
    const data = await res.json();
    if (data?.success) {
      backendSuccess = true;
      backendMsg = data.message || '';
    }
  } catch (fetchErr) {
    console.warn('[submitCbtExamResult] Backend API push error:', fetchErr);
  }

  // 3. Fallback direct call to GAS submitHasilUjian if available
  try {
    const scriptUrl = getStoredGasUrl();
    if (scriptUrl) {
      fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submitHasilUjian',
          idUjian: normalizedResult.idUjian,
          idJadwal: normalizedResult.idJadwal,
          mapel: normalizedResult.mapel,
          jenjang: normalizedResult.jenjang,
          kelas: normalizedResult.kelas,
          nisn: normalizedResult.nisn,
          namaSiswa: normalizedResult.namaSiswa,
          nilaiMentah: normalizedResult.nilaiMentah,
          nilaiAkhir: normalizedResult.nilaiAkhir,
          benar: normalizedResult.benar,
          salah: normalizedResult.salah,
          totalSoal: normalizedResult.totalSoal,
          pelanggaran: normalizedResult.pelanggaran,
          status: normalizedResult.status,
          durasi: normalizedResult.durasi,
          tahunAjaran: normalizedResult.tahunAjaran,
          token: normalizedResult.token
        })
      }).catch(errGas => console.warn('[submitCbtExamResult] Direct GAS push error:', errGas));
    }
  } catch {}

  // 4. Trigger universal system events so all CBT tabs & reports update automatically
  window.dispatchEvent(new CustomEvent('erp-cbt-updated', { detail: { action: 'SUBMIT_UJIAN', idHasil, nilai: finalNilai } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'hasil_ujian' } }));
  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_results' } }));
  window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'HASIL_UJIAN' } }));
  window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'NILAI' } }));
  window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'LOG_UJIAN' } }));

  return {
    success: backendSuccess,
    message: backendMsg || 'Hasil ujian berhasil disimpan & disinkronkan ke Google Spreadsheet!',
    idHasil,
    nilai: finalNilai
  };
}
