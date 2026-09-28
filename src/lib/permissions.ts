import { ALL_32_ROLES, UserRoleItem, TabKey, getRoleById, getRoleByName } from '../data/rolesData';
import { db } from '../data/db';

let currentActiveRoleId = 'RL-001';

export interface UserSessionState {
  roleId: string;
  roleName: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  level: number;
}

// Get active role from sessionStorage, authenticated user, or memory
export function getActiveRole(): UserRoleItem {
  try {
    let roleId = typeof window !== 'undefined' && window.sessionStorage
      ? window.sessionStorage.getItem('current_active_role_id')
      : null;

    if (!roleId && typeof window !== 'undefined' && window.sessionStorage) {
      const authUserRaw = window.sessionStorage.getItem('authenticated_user');
      if (authUserRaw) {
        try {
          const authUser = JSON.parse(authUserRaw);
          roleId = authUser.roleId || (authUser.role === 'SISWA' ? 'RL-026' : authUser.role === 'GURU' ? 'RL-019' : authUser.role === 'ORANG_TUA' ? 'RL-027' : 'RL-001');
        } catch {}
      }
    }

    if (!roleId) {
      roleId = currentActiveRoleId || 'RL-001';
    }

    const savedCustomRoles = db.get<UserRoleItem>('custom_roles');
    if (savedCustomRoles && savedCustomRoles.length > 0) {
      const custom = savedCustomRoles.find(r => r.id === roleId);
      if (custom) return custom;
    }
    
    return getRoleById(roleId);
  } catch {
    return ALL_32_ROLES[0];
  }
}

// Set active role
export function setActiveRole(roleIdOrName: string): UserRoleItem {
  let role = ALL_32_ROLES.find(r => r.id === roleIdOrName || r.namaRole === roleIdOrName.toUpperCase());
  if (!role) {
    role = ALL_32_ROLES[0];
  }
  currentActiveRoleId = role.id;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('current_active_role_id', role.id);
    }
  } catch {}
  // Dispatch custom event for realtime UI update
  window.dispatchEvent(new CustomEvent('roleChanged', { detail: role }));
  return role;
}

// Get all roles (with any user customized permissions from DB if modified)
export function getAllRolesList(): UserRoleItem[] {
  try {
    const custom = db.get<UserRoleItem>('custom_roles');
    if (custom && custom.length === ALL_32_ROLES.length) {
      return custom;
    }
  } catch (e) {
    console.error(e);
  }
  return ALL_32_ROLES;
}

// Save updated role list
export function saveCustomRolesList(roles: UserRoleItem[]): void {
  db.set('custom_roles', roles);
  window.dispatchEvent(new CustomEvent('rolesListUpdated', { detail: roles }));
}

// Check if a specific role can access a tab
export function canRoleAccessTab(role: UserRoleItem, tab: TabKey): boolean {
  if (role.level === 1) return true; // Level 1 (SUPERADMIN, KETUA_YAYASAN) has broad executive/super access
  if (role.id === 'RL-001' || role.id === 'RL-002') return true;
  return role.allowedTabs.includes(tab);
}

// Check if the currently active role can access a tab
export function canCurrentRoleAccessTab(tab: TabKey): boolean {
  const currentRole = getActiveRole();
  return canRoleAccessTab(currentRole, tab);
}

// Check action permission (create, edit, delete, export, approve, etc.)
export function canPerformAction(
  action: 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'settings' | 'manageUsers',
  roleOverride?: UserRoleItem
): boolean {
  const role = roleOverride || getActiveRole();
  if (role.id === 'RL-001') return true; // Superadmin can do everything

  switch (action) {
    case 'create':
      return !!role.generalActions?.canCreate;
    case 'edit':
      return !!role.generalActions?.canEdit;
    case 'delete':
      return !!role.generalActions?.canDelete;
    case 'export':
      return !!role.generalActions?.canExport;
    case 'approve':
      return !!role.generalActions?.canApprove;
    case 'settings':
      return !!role.generalActions?.canManageSettings;
    case 'manageUsers':
      return !!role.generalActions?.canManageUsers;
    default:
      return true;
  }
}

// Helper hook / subscription for React components
export function useActiveRole() {
  const [role, setRoleState] = React.useState<UserRoleItem>(getActiveRole());

  React.useEffect(() => {
    const handleRoleChanged = (e: Event) => {
      const customEvent = e as CustomEvent<UserRoleItem>;
      if (customEvent.detail) {
        setRoleState(customEvent.detail);
      } else {
        setRoleState(getActiveRole());
      }
    };

    window.addEventListener('roleChanged', handleRoleChanged);
    window.addEventListener('storage', handleRoleChanged);
    return () => {
      window.removeEventListener('roleChanged', handleRoleChanged);
      window.removeEventListener('storage', handleRoleChanged);
    };
  }, []);

  const switchRole = (newRoleId: string) => {
    const updated = setActiveRole(newRoleId);
    setRoleState(updated);
    return updated;
  };

  return {
    role,
    switchRole,
    canAccess: (tab: TabKey) => canRoleAccessTab(role, tab),
    can: (action: 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'settings' | 'manageUsers') => 
      canPerformAction(action, role),
  };
}

// Re-export role validation functions
export { 
  validateAll32RolesAccess, 
  checkAndNotifyRoleAccess, 
  autoRepairEmptyRoles 
} from './roleAccessValidator';
export type { 
  RoleAccessValidationReport, 
  RoleAccessValidationDetail 
} from './roleAccessValidator';

import React from 'react';
