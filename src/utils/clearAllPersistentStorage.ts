/**
 * clearAllPersistentStorage.ts
 * Utilitas untuk membersihkan secara paksa semua data sisa, cache, template mock/dummy,
 * serta penyimpanan lokal aplikasi (localStorage, sessionStorage, IndexedDB)
 * untuk memastikan lingkungan sistem bersih 100% (Clean Slate) sesuai spreadsheet riil.
 */
import { db } from '../data/db';
import { idbClear } from '../data/idbStorage';

export async function clearAllPersistentStorage(): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  try {
    // 0. Hapus data di IndexedDB internal
    await idbClear().catch(() => {});
    // 1. Simpan konfigurasi penting pengguna yang tidak boleh hilang (seperti URL GAS) jika ada
    const gasUrl = localStorage.getItem('erp_gas_url') || localStorage.getItem('ERP_gas_script_url');
    const gasScriptUrl = localStorage.getItem('ERP_gas_script_url');

    // 2. Hapus seluruh data di localStorage
    localStorage.clear();

    // 3. Kembalikan URL GAS jika sebelumnya sudah dikonfigurasi oleh user
    if (gasUrl) {
      localStorage.setItem('erp_gas_url', gasUrl);
    }
    if (gasScriptUrl) {
      localStorage.setItem('ERP_gas_script_url', gasScriptUrl);
    }

    // 4. Hapus seluruh data di sessionStorage
    try {
      sessionStorage.clear();
    } catch {}

    // 5. Hapus seluruh basis data IndexedDB yang terdaftar di browser
    if (window.indexedDB && window.indexedDB.databases) {
      try {
        const dbs = await window.indexedDB.databases();
        for (const dbInfo of dbs) {
          if (dbInfo.name) {
            window.indexedDB.deleteDatabase(dbInfo.name);
          }
        }
      } catch (idbErr) {
        console.warn('IndexedDB database clearance notice:', idbErr);
      }
    }

    // 6. Kosongkan memori internal database untuk seluruh modul keuangan
    const zeroKeys = [
      'keuangan_tagihan', 'TAGIHAN', 'tagihan',
      'keuangan_invoices', 'keuangan_pembayaran', 'PEMBAYARAN', 'INVOICE',
      'keuangan_tabungan', 'TABUNGAN', 'tabungan',
      'keuangan_kas', 'KAS', 'kas',
      'keuangan_biaya', 'BIAYA', 'tarif', 'keuangan_tarif',
      'keuangan_pengeluaran', 'PENGELUARAN'
    ];
    zeroKeys.forEach(k => {
      try {
        db.set(k, []);
        localStorage.setItem(`erp_${k}`, JSON.stringify([]));
      } catch {}
    });

    // 7. Tandai flag pembersihan tuntas
    localStorage.setItem('erp_persistent_storage_purged_v4_clean_1447', 'true');
    localStorage.setItem('erp_persistent_storage_purged', 'true');
    localStorage.setItem('erp_keuangan_cleared', 'true');
    localStorage.setItem('erp_clean_zero_data_v4_purge_1447', 'true');
    localStorage.removeItem('erp_lock_official_tagihan_count');

    // 8. Beri tahu seluruh komponen UI yang sedang aktif
    window.dispatchEvent(new CustomEvent('erp-keuangan-cleared'));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'keuangan_all' } }));

    return true;
  } catch (err) {
    console.error('Failed to clear persistent storage:', err);
    return false;
  }
}
