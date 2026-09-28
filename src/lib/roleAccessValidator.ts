import Swal from 'sweetalert2';
import { ALL_32_ROLES, UserRoleItem, TabKey } from '../data/rolesData';
import { INITIAL_SAMPLE_DATA } from '../data/schemas';
import { db } from '../data/db';
import { getAllRolesList, saveCustomRolesList } from './permissions';

export interface RoleAccessValidationDetail {
  id: string;
  namaRole: string;
  kategori: string;
  level: number;
  isMappedInRolesList: boolean;
  isMappedInHakAkses: boolean;
  allowedTabsCount: number;
  allowedTabs: TabKey[];
  hakAksesEntriesCount: number;
  readableMenusCount: number;
  canViewAnyMenu: boolean;
  hasAnyGeneralAction: boolean;
  isCompletelyEmpty: boolean;
  issues: string[];
  status: 'VALID' | 'WARNING' | 'EMPTY';
}

export interface RoleAccessValidationReport {
  isValid: boolean;
  totalRolesExpected: number; // 32
  totalConfiguredRoles: number;
  mappedInRolesListCount: number;
  mappedInHakAksesCount: number;
  unmappedRoles: { id: string; namaRole: string; reason: string }[];
  emptyAccessRoles: { 
    id: string; 
    namaRole: string; 
    reason: string; 
    severity: 'CRITICAL' | 'WARNING';
    category: string;
    level: number;
  }[];
  details: RoleAccessValidationDetail[];
  summaryMessage: string;
  timestamp: string;
}

/**
 * Validasi komprehensif apakah seluruh 32 role terpetakan dengan benar
 * di tabel akses (rolesList/custom_roles) dan tabel HAK_AKSES (Database/Spreadsheet),
 * serta mendeteksi jika ada role dengan akses kosong.
 */
export function validateAll32RolesAccess(
  providedRoles?: UserRoleItem[],
  providedHakAkses?: any[]
): RoleAccessValidationReport {
  const currentRolesList = providedRoles && providedRoles.length > 0 
    ? providedRoles 
    : getAllRolesList();

  const currentHakAkses = providedHakAkses && providedHakAkses.length > 0
    ? providedHakAkses
    : (db.get<any>('hak_akses') || db.get<any>('HAK_AKSES') || INITIAL_SAMPLE_DATA.HAK_AKSES || []);

  const totalRolesExpected = ALL_32_ROLES.length; // 32
  const unmappedRoles: { id: string; namaRole: string; reason: string }[] = [];
  const emptyAccessRoles: { 
    id: string; 
    namaRole: string; 
    reason: string; 
    severity: 'CRITICAL' | 'WARNING';
    category: string;
    level: number;
  }[] = [];

  const details: RoleAccessValidationDetail[] = [];

  let mappedInRolesListCount = 0;
  let mappedInHakAksesCount = 0;

  ALL_32_ROLES.forEach((standardRole) => {
    const issues: string[] = [];
    
    // 1. Cek pemetaan di daftar role aktif (rolesList/custom_roles)
    const activeRole = currentRolesList.find(
      r => r.id === standardRole.id || r.namaRole.toUpperCase() === standardRole.namaRole.toUpperCase()
    );

    const isMappedInRolesList = !!activeRole;
    if (isMappedInRolesList) {
      mappedInRolesListCount++;
    } else {
      issues.push(`Role belum terdaftar di matriks konfigurasi role aktif`);
      unmappedRoles.push({
        id: standardRole.id,
        namaRole: standardRole.namaRole,
        reason: 'Tidak ditemukan dalam konfigurasi custom_roles/rolesList aktif'
      });
    }

    // 2. Cek pemetaan di tabel HAK_AKSES
    const hakAksesRows = currentHakAkses.filter((item: any) => {
      const itemRole = String(item.role || item.Role || item.RoleID || item.roleId || '').trim().toUpperCase();
      return itemRole === standardRole.namaRole.toUpperCase() || itemRole === standardRole.id.toUpperCase();
    });

    const isMappedInHakAkses = hakAksesRows.length > 0;
    if (isMappedInHakAkses) {
      mappedInHakAksesCount++;
    } else {
      issues.push(`Role belum memiliki entri di tabel HAK_AKSES database/spreadsheet`);
      unmappedRoles.push({
        id: standardRole.id,
        namaRole: standardRole.namaRole,
        reason: 'Tidak memiliki entri baris di tabel HAK_AKSES'
      });
    }

    // 3. Analisis Hak Akses Menu & Tab
    const targetRole = activeRole || standardRole;
    const allowedTabs = targetRole.allowedTabs || [];
    const allowedTabsCount = allowedTabs.length;

    // Cek aksi umum (create, edit, delete, export, approve, settings, dll)
    const genActs = targetRole.generalActions || {} as any;
    const hasAnyGeneralAction = Object.values(genActs).some(val => Boolean(val));

    // Cek izin baca di HAK_AKSES
    let readableMenusCount = 0;
    hakAksesRows.forEach((row: any) => {
      const dapatLihat = String(row.dapatLihat || row.Read || row.read || '').trim().toUpperCase();
      const isAll = String(row.menuId || row.MenuID || '').trim().toUpperCase() === 'MN-ALL';
      if (dapatLihat === 'YA' || dapatLihat === 'TRUE' || dapatLihat === '1' || isAll) {
        readableMenusCount++;
      }
    });

    const canViewAnyMenu = targetRole.level === 1 || readableMenusCount > 0 || allowedTabsCount > 0;

    // 4. Deteksi Akses Kosong (Empty Access)
    let isCompletelyEmpty = false;
    let emptyReason = '';
    let severity: 'CRITICAL' | 'WARNING' = 'WARNING';

    // A. Tidak ada tab modul yang diizinkan sama sekali (kecuali superadmin level 1)
    if (allowedTabsCount === 0 && targetRole.level > 1) {
      isCompletelyEmpty = true;
      emptyReason = 'Tidak memiliki satupun tab modul yang diizinkan (allowedTabs = 0)';
      severity = 'CRITICAL';
      issues.push(emptyReason);
    }

    // B. Tidak ada izin baca menu di tabel HAK_AKSES (jika sudah terdaftar di tabel)
    if (isMappedInHakAkses && readableMenusCount === 0 && targetRole.level > 1) {
      isCompletelyEmpty = true;
      const readReason = 'Semua entri di tabel HAK_AKSES bernilai TIDAK untuk hak baca/lihat';
      emptyReason = emptyReason ? `${emptyReason} & ${readReason}` : readReason;
      severity = 'CRITICAL';
      issues.push(readReason);
    }

    // C. Tab kosong DAN semua aksi dinonaktifkan
    if (allowedTabsCount === 0 && !hasAnyGeneralAction && targetRole.level > 1) {
      isCompletelyEmpty = true;
      severity = 'CRITICAL';
      emptyReason = 'Akses benar-benar kosong: 0 tab modul dan 0 aksi yang diizinkan';
    }

    // D. Peringatan: jika role level > 1 hanya memiliki 0 aksi aktif walau ada tab
    if (!isCompletelyEmpty && !hasAnyGeneralAction && allowedTabsCount > 0 && targetRole.level > 4) {
      issues.push('Role hanya memiliki akses baca tampilan, seluruh tombol aksi (tambah/edit/hapus/ekspor) mati');
    }

    // Simpan ke daftar role kosong jika terindikasi
    if (isCompletelyEmpty) {
      emptyAccessRoles.push({
        id: standardRole.id,
        namaRole: standardRole.namaRole,
        reason: emptyReason,
        severity,
        category: standardRole.kategori,
        level: standardRole.level
      });
    }

    let status: 'VALID' | 'WARNING' | 'EMPTY' = 'VALID';
    if (isCompletelyEmpty) {
      status = 'EMPTY';
    } else if (issues.length > 0) {
      status = 'WARNING';
    }

    details.push({
      id: standardRole.id,
      namaRole: standardRole.namaRole,
      kategori: standardRole.kategori,
      level: standardRole.level,
      isMappedInRolesList,
      isMappedInHakAkses,
      allowedTabsCount,
      allowedTabs,
      hakAksesEntriesCount: hakAksesRows.length,
      readableMenusCount,
      canViewAnyMenu,
      hasAnyGeneralAction,
      isCompletelyEmpty,
      issues,
      status
    });
  });

  const isValid = unmappedRoles.length === 0 && emptyAccessRoles.length === 0;

  let summaryMessage = '';
  if (isValid) {
    summaryMessage = `Semua 32 Role (${totalRolesExpected}/${totalRolesExpected}) berhasil terpetakan dengan benar dan tidak ada role dengan akses kosong.`;
  } else {
    const emptyCount = emptyAccessRoles.length;
    const unmappedCount = unmappedRoles.length;
    summaryMessage = `Ditemukan ketidaksesuaian: ${emptyCount} role dengan akses kosong dan ${unmappedCount} role belum terpetakan lengkap.`;
  }

  return {
    isValid,
    totalRolesExpected,
    totalConfiguredRoles: currentRolesList.length,
    mappedInRolesListCount,
    mappedInHakAksesCount,
    unmappedRoles,
    emptyAccessRoles,
    details,
    summaryMessage,
    timestamp: new Date().toISOString()
  };
}

/**
 * Pulihkan hak akses default untuk role yang kosong atau bermasalah
 */
export function autoRepairEmptyRoles(targetRoleIds?: string[]): {
  repairedCount: number;
  repairedRoles: string[];
} {
  const currentRoles = getAllRolesList();
  const idsToFix = targetRoleIds && targetRoleIds.length > 0 
    ? new Set(targetRoleIds)
    : null;

  const repairedRoles: string[] = [];

  const updatedRoles = ALL_32_ROLES.map((stdRole) => {
    const existing = currentRoles.find(r => r.id === stdRole.id || r.namaRole === stdRole.namaRole);
    
    // Jika role tidak ada atau menjadi target perbaikan atau memiliki tab kosong
    const isTarget = !idsToFix || idsToFix.has(stdRole.id);
    const hasEmptyTabs = !existing || !existing.allowedTabs || existing.allowedTabs.length === 0;

    if (isTarget && (!existing || hasEmptyTabs)) {
      repairedRoles.push(`${stdRole.namaRole} (${stdRole.id})`);
      return { ...stdRole };
    }

    return existing || { ...stdRole };
  });

  saveCustomRolesList(updatedRoles);

  // Pastikan HAK_AKSES di DB terisi
  const existingHakAkses = db.get<any>('hak_akses') || [];
  if (existingHakAkses.length === 0) {
    db.set('hak_akses', INITIAL_SAMPLE_DATA.HAK_AKSES);
  }

  // Notifikasi event
  window.dispatchEvent(new CustomEvent('rolesListUpdated', { detail: updatedRoles }));

  return {
    repairedCount: repairedRoles.length,
    repairedRoles
  };
}

/**
 * Jalankan validasi dan tampilkan notifikasi SweetAlert2 yang elegan
 */
export async function checkAndNotifyRoleAccess(options?: {
  silentIfValid?: boolean;
  rolesList?: UserRoleItem[];
  onFixed?: () => void;
}): Promise<RoleAccessValidationReport> {
  const report = validateAll32RolesAccess(options?.rolesList);

  if (!report.isValid) {
    const emptyCount = report.emptyAccessRoles.length;
    const unmappedCount = report.unmappedRoles.length;

    const emptyListHtml = report.emptyAccessRoles.map(item => `
      <div style="text-align: left; background: #FEF2F2; border-left: 4px solid #EF4444; padding: 8px 12px; margin-bottom: 6px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #991B1B; font-size: 13px;">${item.namaRole} (${item.id})</strong>
          <span style="font-size: 10px; background: #FEE2E2; color: #DC2626; padding: 2px 6px; border-radius: 4px; font-weight: bold;">L${item.level} • ${item.category}</span>
        </div>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #7F1D1D;">${item.reason}</p>
      </div>
    `).join('');

    const result = await Swal.fire({
      title: 'Peringatan: Hak Akses Role Kosong!',
      html: `
        <div style="font-family: inherit; font-size: 13px; text-align: left;">
          <p style="color: #475569; margin-bottom: 12px;">
            Sistem mendeteksi <strong>${emptyCount} dari 32 Role</strong> memiliki akses kosong atau belum terpetakan dengan benar di tabel perizinan. Pengguna dengan role ini tidak akan dapat mengakses modul sekolah.
          </p>
          <div style="max-height: 220px; overflow-y: auto; margin-bottom: 12px;">
            ${emptyListHtml}
          </div>
          <p style="color: #64748B; font-size: 11px; margin-top: 8px;">
            Klik <strong>"Perbaiki Otomatis"</strong> untuk memulihkan perizinan standar dari master 32 role tanpa menghilangkan data lainnya.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4F46E5',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'Perbaiki & Pulihkan Akses',
      cancelButtonText: 'Tutup & Tinjau Manual',
      backdrop: true,
      customClass: {
        popup: 'rounded-3xl shadow-2xl border border-slate-200'
      }
    });

    if (result.isConfirmed) {
      const repairResult = autoRepairEmptyRoles(report.emptyAccessRoles.map(r => r.id));
      await Swal.fire({
        title: 'Berhasil Dipulihkan!',
        text: `${repairResult.repairedCount} Role berhasil dipulihkan ke izin akses standar yang aman.`,
        icon: 'success',
        confirmButtonColor: '#4F46E5',
        timer: 3000,
        customClass: {
          popup: 'rounded-3xl shadow-xl'
        }
      });

      if (options?.onFixed) {
        options.onFixed();
      }
    }
  } else {
    // Seluruh 32 Role Valid
    if (!options?.silentIfValid) {
      await Swal.fire({
        title: '32 Role Terpetakan Sempurna!',
        html: `
          <div style="font-family: inherit; font-size: 13px; text-align: center; color: #334155;">
            <div style="margin: 12px auto; display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: #DCFCE7; color: #16A34A; font-size: 24px;">
              ✓
            </div>
            <p style="font-size: 14px; font-weight: 700; color: #15803D; margin-bottom: 4px;">
              Validasi 100% Lolos
            </p>
            <p style="color: #64748B; font-size: 12px; max-width: 340px; margin: 0 auto;">
              Seluruh <strong>32 Role</strong> terpetakan lengkap di Matriks Akses dan Tabel <code>HAK_AKSES</code> dengan modul aktif dan tidak ada akses yang kosong.
            </p>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#4F46E5',
        confirmButtonText: 'Selesai',
        timer: 3500,
        customClass: {
          popup: 'rounded-3xl shadow-2xl border border-slate-200'
        }
      });
    }
  }

  return report;
}

// Pasang di window agar dapat diuji di console browser
if (typeof window !== 'undefined') {
  (window as any).validateRoleAccess = validateAll32RolesAccess;
  (window as any).checkAndNotifyRoleAccess = checkAndNotifyRoleAccess;
  (window as any).autoRepairEmptyRoles = autoRepairEmptyRoles;
}
