/**
 * Master Data Jadwal Ujian STS (Sumatif Tengah Semester) Ganjil T.A 2026/2027
 * 117 Sesi Terjadwal lengkap untuk Kelas 4, 5, 6, 7, 8, 9, 10, 11, 12 dan Paket A/B/C
 * dengan Kode Sesi resmi dan Token Ujian terkunci
 */

export interface JadwalStsItem {
  id: string; // Kode Sesi
  mapel: string;
  semester: string;
  tahunAjaran: string;
  kelas: string;
  token: string;
  jenis: string;
  tgl: string; // YYYY-MM-DD
  tglDisplay: string;
  jamMulai: string;
  jamSelesai: string;
  durasi: string;
  pengawas: string;
  proktor?: string;
  peserta: number | string;
  status: 'Terjadwal' | 'Berlangsung' | 'Selesai';
  soal: string;
  acakSoal: boolean;
  acakOpsi: boolean;
  tampilkanNilai: boolean;
}

export const JADWAL_STS_GANJIL_2026: JadwalStsItem[] = [
   
];
