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
    // 1. Simpan konfigurasi & sesi penting pengguna yang tidak boleh hilang jika ada
    const gasUrl = localStorage.getItem('erp_gas_url') || localStorage.getItem('ERP_gas_script_url');
    const gasScriptUrl = localStorage.getItem('ERP_gas_script_url');
    const isAuth = localStorage.getItem('sista_is_authenticated') || sessionStorage.getItem('sista_is_authenticated');
    const authUser = localStorage.getItem('authenticated_user') || sessionStorage.getItem('authenticated_user');
    const activeRole = localStorage.getItem('current_active_role_id') || sessionStorage.getItem('current_active_role_id');
    const activePortal = localStorage.getItem('ERP_active_portal') || sessionStorage.getItem('ERP_active_portal');
    const activeStudentId = localStorage.getItem('portal_active_student_id') || sessionStorage.getItem('portal_active_student_id');
    const authStudentId = localStorage.getItem('current_auth_student_id') || sessionStorage.getItem('current_auth_student_id');

    // 2. Hapus seluruh data di localStorage
    localStorage.clear();

    // 3. Kembalikan URL GAS dan sesi jika sebelumnya sudah ada
    if (gasUrl) {
      localStorage.setItem('erp_gas_url', gasUrl);
    }
    if (gasScriptUrl) {
      localStorage.setItem('ERP_gas_script_url', gasScriptUrl);
    }
    if (isAuth) {
      localStorage.setItem('sista_is_authenticated', isAuth);
    }
    if (authUser) {
      localStorage.setItem('authenticated_user', authUser);
    }
    if (activeRole) {
      localStorage.setItem('current_active_role_id', activeRole);
    }
    if (activePortal) {
      localStorage.setItem('ERP_active_portal', activePortal);
    }
    if (activeStudentId) {
      localStorage.setItem('portal_active_student_id', activeStudentId);
    }
    if (authStudentId) {
      localStorage.setItem('current_auth_student_id', authStudentId);
    }

    // 4. Hapus seluruh data di sessionStorage kecuali sesi login
    try {
      sessionStorage.clear();
      if (isAuth) {
        sessionStorage.setItem('sista_is_authenticated', isAuth);
      }
      if (authUser) {
        sessionStorage.setItem('authenticated_user', authUser);
      }
      if (activeRole) {
        sessionStorage.setItem('current_active_role_id', activeRole);
      }
      if (activePortal) {
        sessionStorage.setItem('ERP_active_portal', activePortal);
      }
      if (activeStudentId) {
        sessionStorage.setItem('portal_active_student_id', activeStudentId);
      }
      if (authStudentId) {
        sessionStorage.setItem('current_auth_student_id', authStudentId);
      }
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
