import { db } from './db';
import { MASTER_BIAYA_ROMBEL_37, MASTER_TARIF_ROMBEL_38, RAW_MASTER_BIAYA_ROMBEL_38 } from './keuanganRealBiaya';
import {
  REAL_TAGIHAN_FROM_SHEETS,
  REAL_PEMBAYARAN_FROM_SHEETS,
  REAL_TABUNGAN_FROM_SHEETS,
  REAL_BIAYA_FROM_SHEETS,
} from './keuanganTransactionsData';
import {
  normalizeTagihanRow,
  normalizePembayaranRow,
  normalizeTabunganRow,
  normalizeBiayaRow,
  deduplicateTabunganList,
} from '../lib/keuanganNormalizers';
export { MASTER_BIAYA_ROMBEL_37, MASTER_TARIF_ROMBEL_38, RAW_MASTER_BIAYA_ROMBEL_38 } from './keuanganRealBiaya';

export interface KeuanganKelas {
  id: string;
  nama: string;
  wali: string;
  aktif: boolean;
  createdAt?: string;
}

export interface KeuanganBiaya {
  id: string; // BiayaID
  biayaId?: string;
  kodeBiaya?: string;
  nama: string; // NamaBiaya
  namaBiaya?: string;
  kategori?: string; // Iuran Pendidikan, Kegiatan, Seragam, Ujian, Gedung, Modul/Buku, Lainnya
  jenjang?: string; // Semua Jenjang, Paket A, Paket B, Paket C, dll
  targetKelas?: string; // Target_Kelas
  kelasId: string;
  kelasNama: string;
  siswaId?: string; // Target Siswa Khusus (opsional)
  namaSiswa?: string; // Nama Siswa Tertarget (opsional / 'Semua Siswa')
  nominal: number;
  periode?: string; // Bulanan, Semester, Tahunan, Sekali Bayar
  wajib?: 'Wajib' | 'Sukarela' | 'Pilihan' | string;
  aktif: boolean;
  status?: 'AKTIF' | 'NONAKTIF' | string;
  keterangan?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KeuanganTagihan {
  id: string; // TagihanID
  tagihanId?: string;
  invoiceId?: string;
  nopdkt?: string; // Nomor Pendaftaran
  siswaId: string;
  namaSiswa: string;
  nis?: string;
  kelasId: string;
  kelasNama: string;
  kodeBiaya?: string;
  biayaId: string;
  namaBiaya: string;
  tahunAjaranId?: string;
  semesterId?: string;
  tanggalTagihan?: string;
  tanggalJatuhTempo?: string;
  jatuhTempo: string;
  tanggalBayar?: string;
  nominal: number; // sisa tagihan
  nominalAsli: number; // harga dasar / tarif asli
  diskon?: number;
  denda?: number;
  totalTagihan?: number;
  totalBayar?: number;
  paidAmount: number;
  sisaTagihan?: number;
  periode: string;
  status: 'BELUM' | 'SEBAGIAN' | 'LUNAS';
  keterangan?: string;
  petugasId?: string;
  paidAt?: string;
  paidBy?: string;
  paymentType?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KeuanganInvoice {
  id: string; // PembayaranID
  pembayaranId?: string;
  tagihanId?: string;
  invoiceId: string;
  siswaId: string;
  namaSiswa: string;
  kelasId: string;
  namaKelas: string;
  tanggal?: string;
  tglBayar: string;
  nominal?: number;
  total: number;
  metodePembayaran?: string;
  metode: string; // CASH, TRANSFER, TABUNGAN, QRIS
  noReferensi?: string;
  bank?: string;
  petugasId?: string;
  createdBy: string;
  keterangan?: string;
  catatan?: string;
  status: 'PAID' | 'SUKSES' | 'PENDING' | 'BATAL' | string;
  tagihanIds: string[];
  tahunAjaranId?: string;
  semesterId?: string;
  items: {
    namaBiaya: string;
    periode: string;
    nominal: number;
  }[];
  createdAt: string;
  updatedAt?: string;
}

export interface KeuanganTabungan {
  id: string; // TabunganID
  no?: number;
  No?: number | string;
  tabunganId?: string;
  TabunganID?: string;
  siswaId: string;
  nisn?: string;
  namaSiswa: string;
  studentClass?: string;
  kelasId?: string;
  kelasNama?: string;
  namaKelas?: string;
  kelas?: string;
  tanggal: string;
  tglTransaksi?: string;
  jenisTransaksi?: 'SETOR' | 'TARIK' | string;
  jenis: 'SETOR' | 'TARIK';
  debit?: number;
  kredit?: number;
  nominal: number;
  saldo?: number;
  saldoSebelumnya?: number;
  saldoSesudahnya?: number;
  saldoSetelahnya?: number;
  saldoAkhir?: number;
  petugasId?: string;
  catatan: string;
  keterangan?: string;
  status?: 'SUKSES' | 'SELESAI' | string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KeuanganKas {
  id: string;
  tanggal: string;
  kategori: string;
  jenis: 'MASUK' | 'KELUAR';
  nominal: number;
  keterangan: string;
  petugas: string;
  referensi?: string;
  saldo?: number;
  createdAt: string;
}

export const DEFAULT_BIAYA_MASTER: KeuanganBiaya[] = MASTER_BIAYA_ROMBEL_37;

export const KEUANGAN_STORAGE_KEYS = [
  'keuangan_tagihan', 'TAGIHAN', 'tagihan', 'bills',
  'keuangan_pembayaran', 'PEMBAYARAN', 'pembayaran',
  'keuangan_invoices', 'INVOICE', 'invoices',
  'keuangan_tabungan', 'TABUNGAN', 'tabungan', 'savings',
  'keuangan_kas', 'KAS', 'kas', 'kas_sekolah',
  'keuangan_pengeluaran', 'PENGELUARAN', 'pengeluaran',
  'keuangan_jurnal', 'jurnal',
  'keuangan_laporan', 'laporan_keuangan',
  'keuangan_biaya', 'BIAYA', 'tarif', 'keuangan_tarif'
];

export function seedRealBiayaMaster(_force: boolean = false): void {
  // Clean slate: Biaya dikelola murni oleh pengguna atau sinkronisasi spreadsheet
  return;
}

// Bersihkan seluruh data transaksi keuangan secara tuntas (100% Bersih / Clean Slate)
export function purgeAllKeuanganData(_keepTarif: boolean = false): void {
  KEUANGAN_STORAGE_KEYS.forEach(key => {
    db.set(key, []);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`erp_${key}`);
        localStorage.setItem(`erp_${key}`, JSON.stringify([]));
      } catch {}
    }
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('erp_keuangan_cleared', 'true');
      localStorage.removeItem('erp_lock_official_tagihan_count');
      localStorage.setItem('erp_clean_zero_data_v4_purge_1447', 'true');
      localStorage.setItem('erp_persistent_storage_purged_v4_clean_1447', 'true');
      window.dispatchEvent(new CustomEvent('erp-keuangan-cleared'));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tagihan' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_invoices' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tabungan' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_kas' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_biaya' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'tarif' } }));
    } catch {}
  }
}

// Dinonaktifkan total: Dilarang menggunakan data dummy, sampel, atau saldo fiktif
export function seedDefaultKeuanganTransactions(_studentsList?: any[], _force: boolean = false): void {
  // No-op: Sistem beroperasi murni dengan data riil dari Google Sheets, file impor, atau entri pengguna
  return;
}


// Status apakah pengguna secara sengaja mengosongkan seluruh riwayat transaksi
export function isKeuanganCleared(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('erp_keuangan_cleared') === 'true';
}

// Fungsi untuk menghapus permanen seluruh riwayat transaksi keuangan (Tabungan, Tagihan, Pembayaran/Invoice)
export function clearAllKeuanganTransactions(): void {
  try {
    db.set('keuangan_tagihan', [], { skipPush: true });
    db.set('TAGIHAN', [], { skipPush: true });
    db.set('keuangan_invoices', [], { skipPush: true });
    db.set('keuangan_pembayaran', [], { skipPush: true });
    db.set('PEMBAYARAN', [], { skipPush: true });
    db.set('keuangan_tabungan', [], { skipPush: true });
    db.set('TABUNGAN', [], { skipPush: true });

    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_keuangan_cleared', 'true');
      localStorage.removeItem('erp_lock_official_tagihan_count');
      localStorage.setItem('erp_keuangan_tagihan', JSON.stringify([]));
      localStorage.setItem('erp_TAGIHAN', JSON.stringify([]));
      localStorage.setItem('erp_keuangan_invoices', JSON.stringify([]));
      localStorage.setItem('erp_PEMBAYARAN', JSON.stringify([]));
      localStorage.setItem('erp_keuangan_tabungan', JSON.stringify([]));
      localStorage.setItem('erp_TABUNGAN', JSON.stringify([]));

      window.dispatchEvent(new CustomEvent('erp-keuangan-cleared'));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tagihan' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_invoices' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tabungan' } }));
    }
  } catch (err) {
    console.error('Error clearing keuangan transactions:', err);
  }
}

// Fungsi untuk merestore data default transaksi dari Sheets jika diperlukan kembali
export function restoreDefaultKeuanganTransactions(studentsList?: any[]): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('erp_keuangan_cleared');
  }
  initKeuanganDefaultData(studentsList, true);
}

// Bersihkan transaksi dummy bawaan template agar sistem murni menggunakan data riil
export function cleanResidualDummyKeuangan(): void {
  if (isKeuanganCleared()) {
    return;
  }
  try {
    // 1. Tagihan dummy (bersihkan tagihan mock/dummy fiktif)
    const rawTagihan = (db.get('keuangan_tagihan') || db.get('TAGIHAN')) as any[];
    if (Array.isArray(rawTagihan) && rawTagihan.length > 0) {
      const filtered = rawTagihan.filter(t => {
        const id = String(t.TagihanID || t.tagihanId || t.id || '');
        const isDummy = id.startsWith('DUMMY_') || id.startsWith('MOCK_') || t.namaSiswa === 'Siswa Dummy';
        return !isDummy;
      });
      if (filtered.length !== rawTagihan.length) {
        db.set('keuangan_tagihan', filtered, { skipPush: true });
        db.set('TAGIHAN', filtered, { skipPush: true });
      }
    }

    // 2. Invoices / Kwitansi dummy
    const rawInvoices = (db.get('keuangan_invoices') || db.get('PEMBAYARAN')) as any[];
    if (Array.isArray(rawInvoices) && rawInvoices.length > 0) {
      const filteredInv = rawInvoices.filter(inv => {
        const id = String(inv.id || inv.invoiceId || '');
        const isDummySeed = id.startsWith('INV-2026') || id.startsWith('BYR_2026');
        const isDummyKasir = inv.createdBy === 'Kasir Bendahara' || inv.petugasId === 'Kasir Keuangan KTCT';
        return !(isDummySeed && isDummyKasir);
      });
      if (filteredInv.length !== rawInvoices.length) {
        db.set('keuangan_invoices', filteredInv, { skipPush: true });
        db.set('PEMBAYARAN', filteredInv, { skipPush: true });
      }
    }

    // 3. Tabungan dummy
    const rawTabungan = (db.get('keuangan_tabungan') || db.get('TABUNGAN')) as any[];
    if (Array.isArray(rawTabungan) && rawTabungan.length > 0) {
      const filteredTab = rawTabungan.filter(tab => {
        const catatan = String(tab.catatan || '');
        const petugas = String(tab.petugasId || '');
        const isDummySeedNote = catatan === 'Setoran Awal Tabungan Semester Ganjil' ||
          catatan === 'Penarikan untuk pembelian perlengkapan belajar' ||
          catatan === 'Setoran Rutin Tabungan Siswa' ||
          catatan === 'Penarikan perlengkapan sekolah' ||
          petugas === 'Petugas Kasir Keuangan';
        return !isDummySeedNote;
      });
      if (filteredTab.length !== rawTabungan.length) {
        db.set('keuangan_tabungan', filteredTab, { skipPush: true });
        db.set('TABUNGAN', filteredTab, { skipPush: true });
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tabungan' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tagihan' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_invoices' } }));
    }
  } catch (err) {
    console.warn('cleanResidualDummyKeuangan notice:', err);
  }
}

// Inisialisasi: Clean Slate (0 Data transaksi & biaya bawaan)
export function initKeuanganDefaultData(_studentsList?: any[], _force: boolean = false) {
  // Bersihkan sisa transaksi dummy bawaan jika ada
  cleanResidualDummyKeuangan();
  cleanseAndDeduplicateTabungan();
}

/**
 * Deduplikasi tabungan secara permanen untuk memastikan tidak pernah terhitung dobel/ganda
 */
export function cleanseAndDeduplicateTabungan(): void {
  try {
    const currentTab = (db.get('keuangan_tabungan') || db.get('TABUNGAN')) as any[];
    if (Array.isArray(currentTab) && currentTab.length > 0) {
      const normalized = currentTab.map((r, i) => normalizeTabunganRow(r, i));
      const dedupedTab = deduplicateTabunganList(normalized);
      if (dedupedTab.length < currentTab.length || currentTab.length > 1637) {
        db.set('keuangan_tabungan', dedupedTab, { skipPush: true });
        db.set('TABUNGAN', dedupedTab, { skipPush: true });
        try {
          localStorage.setItem('erp_keuangan_tabungan', JSON.stringify(dedupedTab));
          localStorage.setItem('erp_TABUNGAN', JSON.stringify(dedupedTab));
        } catch {}
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tabungan', skipPush: true } }));
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all', skipPush: true } }));
      }
    }
  } catch {}
}

// Auto-init: Bersihkan seluruh data dummy tagihan 1447 secara permanen dan deduplikasi tabungan
if (typeof window !== 'undefined') {
  try {
    cleanseAndDeduplicateTabungan();

    // Jalankan deduplikasi saat IndexedDB selesai dimuat
    window.addEventListener('erp-db-synced', () => {
      setTimeout(() => {
        cleanseAndDeduplicateTabungan();
      }, 50);
    });

    // Jalankan berulang pada awal pemuatan aplikasi untuk memastikan kondisi bersih
    setTimeout(cleanseAndDeduplicateTabungan, 100);
    setTimeout(cleanseAndDeduplicateTabungan, 300);
    setTimeout(cleanseAndDeduplicateTabungan, 800);

    const PURGE_TABUNGAN_BLOAT_KEY = 'erp_clean_bloated_tabungan_1637_v3';
    if (!localStorage.getItem(PURGE_TABUNGAN_BLOAT_KEY)) {
      cleanseAndDeduplicateTabungan();
      localStorage.setItem(PURGE_TABUNGAN_BLOAT_KEY, 'true');
    }

    const PURGE_TAGIHAN_1447_KEY = 'erp_clean_dummy_tagihan_1447_permanent_v6';
    if (!localStorage.getItem(PURGE_TAGIHAN_1447_KEY)) {
      // 1. Kosongkan tagihan dummy 1447 secara permanen
      db.set('keuangan_tagihan', [], { skipPush: true });
      db.set('TAGIHAN', [], { skipPush: true });
      localStorage.removeItem('erp_keuangan_tagihan');
      localStorage.removeItem('erp_TAGIHAN');
      localStorage.removeItem('erp_lock_official_tagihan_count');
      try {
        localStorage.setItem('erp_keuangan_tagihan', JSON.stringify([]));
        localStorage.setItem('erp_TAGIHAN', JSON.stringify([]));
      } catch {}

      cleanseAndDeduplicateTabungan();

      localStorage.setItem(PURGE_TAGIHAN_1447_KEY, 'true');
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tagihan' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_tabungan' } }));
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all' } }));
    }
  } catch {}
}



