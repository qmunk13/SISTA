import { User } from '../types';

export interface RolePermissionConfig {
  role: string;
  menus: string[];        // Allowed menu IDs
  permissions: string[];  // Allowed action permission IDs
}

export const AVAILABLE_ROLES = [
  { id: 'SUPERADMIN', label: 'Super Admin' },
  { id: 'ADMIN', label: 'Administrator' },
  { id: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator' },
  { id: 'DEVELOPER', label: 'Developer' },
  { id: 'TECHNICAL_SUPPORT', label: 'Technical Support' },
  { id: 'KETUA_YAYASAN', label: 'Ketua Yayasan' },
  { id: 'PENGURUS_YAYASAN', label: 'Pengurus Yayasan' },
  { id: 'PENGAWAS_YAYASAN', label: 'Pengawas Yayasan' },
  { id: 'KEPALA_SEKOLAH', label: 'Kepala Sekolah' },
  { id: 'WAKASEK_KURIKULUM', label: 'Wakasek Kurikulum' },
  { id: 'WAKASEK_KESISWAAN', label: 'Wakasek Kesiswaan' },
  { id: 'WAKASEK_SARPRAS', label: 'Wakasek Sarpras' },
  { id: 'WAKASEK_HUMAS', label: 'Wakasek Humas' },
  { id: 'KTU', label: 'KTU' },
  { id: 'OPERATOR', label: 'Operator' },
  { id: 'TU', label: 'TU' },
  { id: 'BENDAHARA', label: 'Bendahara' },
  { id: 'KASIR', label: 'Kasir' },
  { id: 'GURU', label: 'Guru' },
  { id: 'WALI_KELAS', label: 'Wali Kelas' },
  { id: 'BK', label: 'BK' },
  { id: 'PUSTAKAWAN', label: 'Pustakawan' },
  { id: 'PETUGAS_UKS', label: 'Petugas UKS' },
  { id: 'INVENTARIS', label: 'Inventaris' },
  { id: 'ADMIN_CBT', label: 'Admin CBT' },
  { id: 'SISWA', label: 'Siswa' },
  { id: 'ORANG_TUA', label: 'Orang Tua' },
  { id: 'ALUMNI', label: 'Alumni' },
  { id: 'VENDOR', label: 'Vendor' },
  { id: 'GUEST', label: 'Guest (Pengunjung)' },
  { id: 'CALON_SISWA', label: 'Calon Siswa' },
  { id: 'ORTU_CALON_SISWA', label: 'Orang Tua Calon Siswa' }
];

export const AVAILABLE_MENUS = [
  { id: 'dashboard', label: 'Dashboard ERP' },
  { id: 'master', label: 'Master Data' },
  { id: 'spmb', label: 'SPMB' },
  { id: 'akademik', label: 'Akademik' },
  { id: 'cbt', label: 'CBT/Ujian' },
  { id: 'penugasan', label: 'Penugasan' },
  { id: 'keuangan', label: 'Keuangan' },
  { id: 'bk', label: 'BK' },
  { id: 'perpustakaan', label: 'Perpustakaan' },
  { id: 'inventaris', label: 'Inventaris' },
  { id: 'dokumen', label: 'Dokumen' },
  { id: 'laporan', label: 'Laporan' },
  { id: 'riwayat', label: 'Riwayat & Arsip' },
  { id: 'pengaturan', label: 'Pengaturan / Profil' }
];

export const AVAILABLE_PERMISSIONS = [
  { id: 'view', label: 'View (Melihat Data)' },
  { id: 'create', label: 'Create (Menambah Data)' },
  { id: 'edit', label: 'Edit (Mengubah Data)' },
  { id: 'delete', label: 'Delete (Menghapus Data)' },
  { id: 'approve', label: 'Approve (Menyetujui)' },
  { id: 'reject', label: 'Reject (Menolak)' },
  { id: 'verify', label: 'Verify (Verifikasi)' },
  { id: 'import', label: 'Import Excel/CSV' },
  { id: 'export', label: 'Export PDF/Excel' },
  { id: 'print', label: 'Print (Cetak)' },
  { id: 'upload', label: 'Upload Berkas' },
  { id: 'download', label: 'Download Berkas' },
  { id: 'backup', label: 'Backup Database' },
  { id: 'restore', label: 'Restore Database' },
  { id: 'setting', label: 'Mengubah Setting' },
  { id: 'manage_user', label: 'Manage User' },
  { id: 'manage_role', label: 'Manage Role' },
  { id: 'manage_menu', label: 'Manage Menu' },
  { id: 'manage_permission', label: 'Manage Hak Akses' },
  { id: 'audit_log', label: 'Audit Log' },
  { id: 'api_access', label: 'API Access' },
  { id: 'developer_mode', label: 'Developer Mode' }
];

// Pre-defined enterprise default matrix
export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissionConfig> = {
  SUPERADMIN: {
    role: 'SUPERADMIN',
    menus: ['dashboard', 'master', 'spmb', 'akademik', 'cbt', 'penugasan', 'keuangan', 'bk', 'perpustakaan', 'inventaris', 'dokumen', 'laporan', 'riwayat', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'verify', 'import', 'export', 'print', 'upload', 'download', 'backup', 'restore', 'setting', 'manage_user', 'manage_role', 'manage_menu', 'manage_permission', 'audit_log', 'api_access', 'developer_mode']
  },
  ADMIN: {
    role: 'ADMIN',
    menus: ['dashboard', 'master', 'spmb', 'akademik', 'cbt', 'penugasan', 'keuangan', 'bk', 'perpustakaan', 'inventaris', 'dokumen', 'laporan', 'riwayat', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'verify', 'import', 'export', 'print', 'upload', 'download', 'backup', 'setting', 'manage_user', 'manage_role', 'manage_menu', 'manage_permission', 'audit_log']
  },
  SYSTEM_ADMINISTRATOR: {
    role: 'SYSTEM_ADMINISTRATOR',
    menus: ['dashboard', 'master', 'dokumen', 'pengaturan'],
    permissions: ['view', 'backup', 'restore', 'setting', 'manage_user', 'manage_role', 'manage_menu', 'manage_permission', 'audit_log', 'api_access']
  },
  DEVELOPER: {
    role: 'DEVELOPER',
    menus: ['dashboard', 'dokumen', 'pengaturan'],
    permissions: ['view', 'setting', 'audit_log', 'api_access', 'developer_mode']
  },
  TECHNICAL_SUPPORT: {
    role: 'TECHNICAL_SUPPORT',
    menus: ['dashboard', 'pengaturan'],
    permissions: ['view', 'setting', 'manage_user', 'audit_log']
  },
  KETUA_YAYASAN: {
    role: 'KETUA_YAYASAN',
    menus: ['dashboard', 'spmb', 'akademik', 'keuangan', 'laporan', 'riwayat', 'pengaturan'],
    permissions: ['view', 'approve', 'reject', 'export', 'print', 'download', 'audit_log']
  },
  YAYASAN: {
    role: 'YAYASAN',
    menus: ['dashboard', 'spmb', 'akademik', 'cbt', 'keuangan', 'bk', 'perpustakaan', 'inventaris', 'dokumen', 'laporan', 'riwayat', 'pengaturan'],
    permissions: ['view', 'approve', 'reject', 'verify', 'export', 'print', 'upload', 'download', 'setting', 'audit_log']
  },
  PENGURUS_YAYASAN: {
    role: 'PENGURUS_YAYASAN',
    menus: ['dashboard', 'akademik', 'keuangan', 'inventaris', 'laporan', 'riwayat', 'pengaturan'],
    permissions: ['view', 'approve', 'reject', 'export', 'print', 'download']
  },
  PENGAWAS_YAYASAN: {
    role: 'PENGAWAS_YAYASAN',
    menus: ['dashboard', 'akademik', 'keuangan', 'inventaris', 'laporan', 'riwayat', 'pengaturan'],
    permissions: ['view', 'export', 'print', 'download']
  },
  KEPALA_SEKOLAH: {
    role: 'KEPALA_SEKOLAH',
    menus: ['dashboard', 'spmb', 'akademik', 'cbt', 'keuangan', 'bk', 'perpustakaan', 'inventaris', 'dokumen', 'laporan', 'riwayat', 'pengaturan'],
    permissions: ['view', 'approve', 'reject', 'verify', 'export', 'print', 'upload', 'download', 'setting']
  },
  WAKASEK_KURIKULUM: {
    role: 'WAKASEK_KURIKULUM',
    menus: ['dashboard', 'akademik', 'cbt', 'laporan', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'verify', 'export', 'print', 'upload', 'download']
  },
  WAKASEK_KESISWAAN: {
    role: 'WAKASEK_KESISWAAN',
    menus: ['dashboard', 'akademik', 'bk', 'laporan', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'verify', 'export', 'print']
  },
  WAKASEK_SARPRAS: {
    role: 'WAKASEK_SARPRAS',
    menus: ['dashboard', 'inventaris', 'laporan', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'verify', 'export', 'print']
  },
  WAKASEK_HUMAS: {
    role: 'WAKASEK_HUMAS',
    menus: ['dashboard', 'dokumen', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'export', 'print']
  },
  KTU: {
    role: 'KTU',
    menus: ['dashboard', 'master', 'akademik', 'dokumen', 'laporan', 'riwayat', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'export', 'print', 'upload', 'download']
  },
  OPERATOR: {
    role: 'OPERATOR',
    menus: ['dashboard', 'master', 'spmb', 'akademik', 'laporan', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'verify', 'import', 'export', 'print', 'upload', 'download']
  },
  TU: {
    role: 'TU',
    menus: ['dashboard', 'master', 'akademik', 'dokumen', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'export', 'print', 'upload', 'download']
  },
  BENDAHARA: {
    role: 'BENDAHARA',
    menus: ['dashboard', 'keuangan', 'laporan', 'riwayat', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'print', 'upload', 'download']
  },
  KASIR: {
    role: 'KASIR',
    menus: ['dashboard', 'keuangan', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'print']
  },
  GURU: {
    role: 'GURU',
    menus: ['dashboard', 'akademik', 'cbt', 'penugasan', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'print', 'upload', 'download']
  },
  WALI_KELAS: {
    role: 'WALI_KELAS',
    menus: ['dashboard', 'akademik', 'cbt', 'penugasan', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'print', 'upload', 'download']
  },
  BK: {
    role: 'BK',
    menus: ['dashboard', 'akademik', 'bk', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'export', 'print']
  },
  PUSTAKAWAN: {
    role: 'PUSTAKAWAN',
    menus: ['dashboard', 'perpustakaan', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'export', 'print']
  },
  PETUGAS_UKS: {
    role: 'PETUGAS_UKS',
    menus: ['dashboard', 'pengaturan'],
    permissions: ['view', 'create', 'edit']
  },
  INVENTARIS: {
    role: 'INVENTARIS',
    menus: ['dashboard', 'inventaris', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'export', 'print']
  },
  ADMIN_CBT: {
    role: 'ADMIN_CBT',
    menus: ['dashboard', 'cbt', 'pengaturan'],
    permissions: ['view', 'create', 'edit', 'delete', 'verify', 'export', 'print']
  },
  SISWA: {
    role: 'SISWA',
    menus: ['dashboard', 'akademik', 'cbt', 'penugasan', 'keuangan', 'perpustakaan'],
    permissions: ['view', 'download', 'print']
  },
  ORANG_TUA: {
    role: 'ORANG_TUA',
    menus: ['dashboard', 'akademik', 'keuangan', 'bk', 'pengaturan'],
    permissions: ['view', 'print']
  },
  ALUMNI: {
    role: 'ALUMNI',
    menus: ['dashboard', 'pengaturan'],
    permissions: ['view', 'create', 'edit']
  },
  VENDOR: {
    role: 'VENDOR',
    menus: ['dashboard', 'pengaturan'],
    permissions: ['view', 'create']
  },
  GUEST: {
    role: 'GUEST',
    menus: [],
    permissions: ['view']
  },
  CALON_SISWA: {
    role: 'CALON_SISWA',
    menus: [],
    permissions: ['view', 'upload', 'print']
  },
  ORTU_CALON_SISWA: {
    role: 'ORTU_CALON_SISWA',
    menus: [],
    permissions: ['view']
  }
};

// Initialize permissions in local storage if not exists
export function initPermissionsStorage() {
  const existing = localStorage.getItem('ERP_matrix_permissions');
  if (!existing) {
    localStorage.setItem('ERP_matrix_permissions', JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
  }
}

// Retrieve entire matrix
export function getPermissionsMatrix(): Record<string, RolePermissionConfig> {
  initPermissionsStorage();
  const data = localStorage.getItem('ERP_matrix_permissions');
  const matrix = data ? JSON.parse(data) : { ...DEFAULT_ROLE_PERMISSIONS };
  
  // Auto-migrate: ensure 'penugasan' is in menus for default allowed roles
  Object.keys(DEFAULT_ROLE_PERMISSIONS).forEach((role) => {
    if (DEFAULT_ROLE_PERMISSIONS[role].menus.includes('penugasan') && matrix[role]) {
      if (!matrix[role].menus.includes('penugasan')) {
        matrix[role].menus.push('penugasan');
      }
    }
  });

  // Auto-migrate: ensure 'riwayat' is in menus for default allowed roles
  Object.keys(DEFAULT_ROLE_PERMISSIONS).forEach((role) => {
    if (DEFAULT_ROLE_PERMISSIONS[role].menus.includes('riwayat') && matrix[role]) {
      if (!matrix[role].menus.includes('riwayat')) {
        matrix[role].menus.push('riwayat');
      }
    }
  });

  if (matrix.SISWA) {
    matrix.SISWA.menus = matrix.SISWA.menus.filter((m: string) => m !== 'pengaturan');
  }
  return matrix;
}

// Save permissions matrix
export function savePermissionsMatrix(matrix: Record<string, RolePermissionConfig>) {
  localStorage.setItem('ERP_matrix_permissions', JSON.stringify(matrix));
}

// Extract dynamic list of roles assigned to a user (supporting multi-role!)
export function getUserRoles(user: User | null): string[] {
  if (!user) return ['GUEST'];
  
  // Safe parsing of multi-roles
  let roles: string[] = [];
  
  // Check if user has explicit multi-roles list
  if ((user as any).roles && Array.isArray((user as any).roles) && (user as any).roles.length > 0) {
    roles = (user as any).roles;
  } else if (user.role) {
    // Standard role compatibility. Let's map old dash/space role to normalized IDs
    const normalized = user.role.replace(' ', '_').toUpperCase();
    roles = [normalized];
  }
  
  if (roles.length === 0) roles = ['GUEST'];
  return roles;
}

// Check Menu Access dynamically against user's multiple roles
export function hasMenuAccess(user: User | null, menuId: string): boolean {
  if (!user) return false;
  
  // SUPERADMIN has bypass access to all menus
  const roles = getUserRoles(user);
  if (roles.includes('SUPERADMIN')) return true;
  
  const matrix = getPermissionsMatrix();
  
  // Check if any of the user's roles has access to this menu
  return roles.some(role => {
    const config = matrix[role] || DEFAULT_ROLE_PERMISSIONS[role];
    return config ? config.menus.includes(menuId) : false;
  });
}

// Check Action Permission dynamically against user's multiple roles
export function hasActionAccess(user: User | null, actionId: string, menuContext?: string): boolean {
  if (!user) return false;
  
  // SUPERADMIN has bypass access to all actions
  const roles = getUserRoles(user);
  if (roles.includes('SUPERADMIN')) return true;
  
  const matrix = getPermissionsMatrix();
  
  // If we are checking menu context first, does the user even have access to that menu?
  if (menuContext && !hasMenuAccess(user, menuContext)) {
    return false;
  }
  
  // Check if any of the user's roles has access to this action
  return roles.some(role => {
    const config = matrix[role] || DEFAULT_ROLE_PERMISSIONS[role];
    return config ? config.permissions.includes(actionId) : false;
  });
}
