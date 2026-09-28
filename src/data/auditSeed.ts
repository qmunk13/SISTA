import { db } from './db';

export interface AuditLogItem {
  id: string;
  timestamp: string; // ISO string or human date
  user: string;
  role: string;
  modul: 'Kesiswaan' | 'Akademik' | 'Keuangan' | 'Sarpras & Aset' | 'Dokumen & Surat' | 'SPMB' | 'CBT & Ujian' | 'Bimbingan Konseling' | 'Kepegawaian' | 'Master Data' | 'Sistem & Keamanan';
  aksi: 'TAMBAH' | 'EDIT' | 'HAPUS' | 'LOGIN' | 'EKSPOR' | 'IMPORT' | 'CETAK' | 'SINKRONISASI' | 'DISPOSISI' | 'VERIFIKASI';
  target: string;
  rincian: string;
  ipAddress?: string;
  status: 'SUKSES' | 'PERINGATAN' | 'GAGAL';
}

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];

export function ensureAuditLogSeedData(): void {
  // Clean empty database
}
