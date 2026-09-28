import { db } from './db';

export interface BarangSarpras {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Elektronik & IT' | 'Mebel & Perabot' | 'Laboratorium' | 'Olahraga & Seni' | 'Perpustakaan' | 'Kendaraan & Logistik' | 'Peralatan Umum';
  klasifikasiKib: 'KIB A (Tanah)' | 'KIB B (Peralatan & Mesin)' | 'KIB C (Gedung & Bangunan)' | 'KIB D (Jalan/Jaringan)' | 'KIB E (Aset Tetap Lainnya)' | 'KIB F (Konstruksi)';
  jumlah: number;
  satuan: 'Unit' | 'Set' | 'Buah' | 'Pak' | 'Ruang';
  lokasi: string;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  sumberDana: 'Dana BOS' | 'Yayasan' | 'BOP Daerah' | 'Hibah / Donasi' | 'Swadana';
  tahunPerolehan: string;
  hargaPerolehan: number;
  penanggungJawab: string;
  spesifikasi?: string;
  qrCode?: string;
  updatedAt: string;
}

export interface RuanganAset {
  id: string;
  kodeRuangan: string;
  namaRuangan: string;
  gedung: string;
  lantai: number;
  luasM2: number;
  kapasitas: number;
  penanggungJawab: string;
  kondisiRuangan: 'Sangat Baik' | 'Baik' | 'Perlu Renovasi';
  totalItemAset: number;
  keterangan: string;
}

export interface PeminjamanSarpras {
  id: string;
  noPeminjaman: string;
  namaPeminjam: string;
  rolePeminjam: 'Guru' | 'Siswa' | 'Staf TU' | 'OSIS / Ekskul' | 'Pihak Luar';
  kelasAtauUnit: string;
  kontak: string;
  barangId: string;
  namaBarang: string;
  jumlah: number;
  tglPinjam: string;
  tglKembaliRencana: string;
  tglKembaliRealisasi?: string;
  keperluan: string;
  status: 'Menunggu Persetujuan' | 'Dipinjam' | 'Dikembalikan' | 'Terlambat';
  petugas: string;
  catatanKondisi?: string;
}

export interface PerawatanSarpras {
  id: string;
  noTiket: string;
  barangId: string;
  namaBarang: string;
  kodeBarang: string;
  lokasi: string;
  tglLapor: string;
  pelapor: string;
  deskripsiKerusakan: string;
  tingkatKerusakan: 'Ringan' | 'Sedang' | 'Berat';
  tindakanPerbaikan: string;
  teknisiVendor: string;
  estimasiBiaya: number;
  status: 'Diajukan' | 'Sedang Dikerjakan' | 'Selesai' | 'Dihapuskan / Afkir';
  tglSelesai?: string;
  keteranganHasil?: string;
}

export const INITIAL_BARANG_SARPRAS: BarangSarpras[] = [];
export const INITIAL_RUANGAN_ASET: RuanganAset[] = [];
export const INITIAL_PEMINJAMAN_SARPRAS: PeminjamanSarpras[] = [];
export const INITIAL_PERAWATAN_SARPRAS: PerawatanSarpras[] = [];

export function ensureSarprasSeedData(): void {
  // Clean empty database
}
