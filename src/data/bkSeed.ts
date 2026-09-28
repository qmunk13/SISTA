import { db } from './db';

export interface BkKonseling {
  id: string;
  tanggal: string;
  waktu?: string;
  siswaId: string;
  namaSiswa: string;
  nis: string;
  kelas: string;
  konselor: string;
  jenisKonseling: 'Individu' | 'Kelompok' | 'Konsultasi Ortu' | 'Bimbingan Belajar' | 'Bimbingan Pribadi-Sosial' | 'Bimbingan Karir';
  pokokMasalah: string;
  urgensi: 'Biasa' | 'Penting' | 'Mendesak';
  hasilTindakLanjut: string;
  status: 'SELESAI' | 'DALAM PROSES' | 'TERJADWAL' | 'RUJUK AHLI';
  catatanRahasia?: string;
  createdAt: string;
}

export interface BkPelanggaran {
  id: string;
  tanggal: string;
  jam?: string;
  siswaId: string;
  namaSiswa: string;
  nis: string;
  kelas: string;
  klasifikasi: 'Ringan' | 'Sedang' | 'Berat' | 'Sangat Berat';
  bentukPelanggaran: string;
  poin: number; // nilai pengurangan poin misal -10, -25
  sanksi: string;
  petugasPelapor: string;
  status: 'SELESAI PEMBINAAN' | 'MENUNGGU ORTU' | 'DALAM PEMANTAUAN' | 'SP DITERBITKAN';
  tindakLanjutOrtu?: string;
  createdAt: string;
}

export interface BkPrestasi {
  id: string;
  tanggal: string;
  siswaId: string;
  namaSiswa: string;
  nis: string;
  kelas: string;
  namaEvent: string;
  bidang: 'Akademik / Sains' | 'Olahraga' | 'Seni & Budaya' | 'Keagamaan & Tahfidz' | 'Riset & Teknologi';
  tingkat: 'Sekolah' | 'Kecamatan' | 'Kota / Kab' | 'Provinsi' | 'Nasional' | 'Internasional';
  capaian: 'Juara 1 (Emas)' | 'Juara 2 (Perak)' | 'Juara 3 (Perunggu)' | 'Harapan 1' | 'Finalis Terbaik';
  poinReward: number; // nilai penambahan poin misal +25, +50
  penyelenggara: string;
  noSertifikat?: string;
  pembimbing?: string;
  createdAt: string;
}

export interface BkKarir {
  id: string;
  tanggal: string;
  siswaId: string;
  namaSiswa: string;
  nis: string;
  kelas: string;
  tipeKepribadian: string;
  minatBakat: string;
  citaCita: string;
  rekomendasiStudi: string;
  rekomendasiKampusKarir: string;
  catatanKonselor: string;
  status: 'TERPETAKAN' | 'KONSULTASI LANJUTAN' | 'PERSIAPAN DAFTAR' | 'SELESAI REKOMENDASI';
  createdAt: string;
}

export function initBkDefaultData(studentsList: any[] = []) {
  // Simulation data disabled: start with clean empty database
}
