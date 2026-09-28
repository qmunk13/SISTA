import { Role, ActiveTab } from '../types/schema';

// Role Label Mapping for Display
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator Utama',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  GURU: 'Guru Pengajar',
  WAKEL: 'Wali Kelas',
  BENDAHARA: 'Bendahara Keuangan',
  OPERATOR: 'Operator Dapodik/Data',
  BK: 'Guru BK / Bimbingan Konseling',
  SISWA: 'Siswa / Peserta Didik',
  ORTU: 'Orang Tua / Wali Murid',
  CALON_SISWA: 'Calon Siswa (SPMB)',
  ALUMNI: 'Alumni'
};

// Tabs Matrix Definition
export const ROLE_PERMISSIONS: Record<Role, ActiveTab[]> = {
  ADMIN: [
    'dashboard', 'master_data', 'spmb_erp', 'akademik_erp', 'cbt_erp',
    'penugasan', 'keuangan_erp', 'bk_erp', 'inventory_erp', 'dokumen_erp',
    'laporan_erp', 'riwayat_erp', 'pengaturan_erp', 'gas_code'
  ],
  OPERATOR: [
    'dashboard', 'master_data', 'spmb_erp', 'akademik_erp', 'cbt_erp',
    'penugasan', 'keuangan_erp', 'bk_erp', 'inventory_erp', 'dokumen_erp',
    'laporan_erp', 'riwayat_erp', 'pengaturan_erp', 'gas_code'
  ],
  KEPALA_SEKOLAH: [
    'dashboard', 'master_data', 'spmb_erp', 'akademik_erp', 'cbt_erp',
    'penugasan', 'keuangan_erp', 'bk_erp', 'inventory_erp', 'dokumen_erp',
    'laporan_erp', 'riwayat_erp'
  ],
  GURU: [
    'dashboard', 'akademik_erp', 'cbt_erp', 'penugasan', 'dokumen_erp', 'bk_erp'
  ],
  WAKEL: [
    'dashboard', 'master_data', 'akademik_erp', 'cbt_erp', 'penugasan', 'bk_erp', 'dokumen_erp', 'laporan_erp'
  ],
  BENDAHARA: [
    'dashboard', 'keuangan_erp', 'master_data', 'dokumen_erp', 'laporan_erp'
  ],
  BK: [
    'dashboard', 'bk_erp', 'akademik_erp', 'dokumen_erp', 'laporan_erp'
  ],
  SISWA: [
    'dashboard', 'akademik_erp', 'cbt_erp', 'penugasan', 'keuangan_erp', 'dokumen_erp'
  ],
  ORTU: [
    'dashboard', 'akademik_erp', 'keuangan_erp', 'bk_erp', 'dokumen_erp'
  ],
  CALON_SISWA: [
    'dashboard', 'spmb_erp'
  ],
  ALUMNI: [
    'dashboard', 'dokumen_erp', 'riwayat_erp'
  ]
};

export function isTabAllowedForRole(role: Role, tab: ActiveTab): boolean {
  if (!role) return true;
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return true; // Default allow if unknown role
  return allowed.includes(tab);
}

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role] || role;
}
