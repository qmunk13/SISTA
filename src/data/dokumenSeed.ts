import { db } from './db';

export interface ArsipDigital {
  id: string;
  nomorDokumen: string;
  judulDokumen: string;
  kategori: 'SK & Regulasi' | 'Akreditasi' | 'Kurikulum' | 'Laporan Keuangan' | 'Administrasi GTK' | 'Sarpras & Aset' | 'Kesiswaan';
  tahunAjaran: string;
  tahunTerbit: string;
  formatFile: 'PDF' | 'DOCX' | 'XLSX' | 'SCAN / JPG';
  ukuranFile: string;
  fileUrl: string;
  pengunggah: string;
  tingkatAkses: 'Publik' | 'Internal Guru' | 'Pimpinan & TU' | 'Rahasia';
  deskripsi: string;
  tags: string[];
  createdAt: string;
}

export interface SuratMasuk {
  id: string;
  noAgenda: string;
  noSuratAsal: string;
  tanggalSurat: string;
  tanggalDiterima: string;
  pengirim: string;
  kategoriPengirim: 'Dinas Pendidikan' | 'Kemenag' | 'Sekolah Lain' | 'Yayasan' | 'Perguruan Tinggi' | 'Instansi Swasta' | 'Masyarakat';
  perihal: string;
  sifat: 'Sangat Segera' | 'Penting' | 'Biasa' | 'Rahasia';
  statusDisposisi: 'Menunggu Disposisi' | 'Didisposisikan' | 'Dalam Proses' | 'Selesai';
  instruksiDisposisi?: string;
  diteruskanKepada?: string;
  tenggatWaktu?: string;
  catatanKepsek?: string;
  lampiranNama?: string;
  lampiranUrl?: string;
  penerimaBerkas: string;
  createdAt: string;
}

export interface SuratKeluar {
  id: string;
  noSurat: string;
  kodeKlasifikasi: string;
  tanggalSurat: string;
  jenisSurat: 'Surat Keterangan Siswa Aktif' | 'Undangan Rapat Orang Tua' | 'Surat Tugas Guru' | 'Surat Rekomendasi' | 'Permohonan Izin / Kunjungan' | 'Panggilan Orang Tua' | 'Surat Pengantar Dinas';
  penerima: string;
  alamatPenerima?: string;
  perihal: string;
  isiSurat?: string;
  penandatangan: string;
  jabatanPenandatangan: string;
  status: 'Diterbitkan / Sah' | 'Draft' | 'Terkirim' | 'Dibatalkan';
  siswaId?: string;
  namaSiswa?: string;
  nisn?: string;
  kelas?: string;
  keperluan?: string;
  tembusan?: string;
  createdAt: string;
}

export interface MasterTemplateSurat {
  id: string;
  kodeTemplate: string;
  namaTemplate: string;
  kategori: 'Kesiswaan' | 'Kepegawaian' | 'Humas & Kerjasama' | 'Akademik' | 'Administrasi Umum';
  deskripsi: string;
  variabel: string[];
  penandatanganDefault: string;
  jabatanDefault: string;
  formatKop: string;
  strukturIsi: string;
  status: 'Aktif' | 'Nonaktif';
  updatedAt: string;
}

export const INITIAL_ARSIP_SEED: ArsipDigital[] = [];

export const INITIAL_SURAT_MASUK_SEED: SuratMasuk[] = [];

export const INITIAL_SURAT_KELUAR_SEED: SuratKeluar[] = [];

export const INITIAL_TEMPLATE_SEED: MasterTemplateSurat[] = [];

export function ensureDokumenSeedData() {
  // Clean empty database
}
