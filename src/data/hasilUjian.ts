import { HasilUjian } from '../types';

export const parseHasilUjian = (tsv: string): HasilUjian[] => {
  const lines = tsv.trim().split('\n');
  if (lines.length < 2) return [];

  const list: HasilUjian[] = [];
  const headers = lines[0].split('\t').map(h => h.trim().toUpperCase());

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split('\t').map(c => c.trim());
    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] || '';
    });

    const id = row.ID_HASIL || `HSL-${Date.now()}-${i}`;
    const idUjian = row.ID_UJIAN || '';
    const idJadwal = row.ID_JADWAL || '';
    const mapel = row.MAPEL || '';
    const kelas = row.KELAS || '';
    const nisn = row.NISN || '';
    const namaSiswa = row.NAMA_SISWA || '';
    const nilaiMentah = parseFloat(row.NILAI) || 0;
    const nilaiAkhir = parseFloat(row.NILAI_AKHIR) || nilaiMentah;
    const benar = parseInt(row.BENAR, 10) || 0;
    const salah = parseInt(row.SALAH, 10) || 0;
    const totalSoal = parseInt(row.TOTAL_SOAL, 10) || (benar + salah) || 20;
    const pelanggaran = parseInt(row.PELANGGARAN, 10) || 0;
    const status = row.STATUS || '⚠️ SELESAI';
    const tanggal = row.WAKTU_SELESAI || row.WAKTU_MULAI || new Date().toLocaleDateString('id-ID');
    const durasi = row.DURASI || '';
    const tahunAjaran = row.TAHUN_AJARAN || '2025/2026';
    const semester = row.SEMESTER || 'Genap';
    const jenjang = row.JENJANG || '';
    
    // Extract ID Asesmen or Jenis Asesmen if possible
    const idAsesmen = idUjian;
    let jenisAsesmen = 'ASAS';
    if (idUjian.includes('ASTS')) jenisAsesmen = 'ASTS';
    else if (idUjian.includes('ASAS')) jenisAsesmen = 'ASAS';
    else if (idUjian.includes('ASAJ')) jenisAsesmen = 'ASAJ';

    list.push({
      id,
      idUjian,
      idJadwal,
      mapel,
      kelas,
      nisn,
      namaSiswa,
      nilaiMentah,
      nilaiAkhir,
      benar,
      salah,
      totalSoal,
      pelanggaran,
      status,
      tanggal,
      durasi,
      tahunAjaran,
      semester,
      jenjang,
      idAsesmen,
      jenisAsesmen
    });
  }

  return list;
};
