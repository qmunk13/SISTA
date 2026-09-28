import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, Lock, FileX, HelpCircle } from 'lucide-react';
import { User } from '../types';
import { hasMenuAccess, getPermissionsMatrix, AVAILABLE_MENUS } from '../utils/permissionHelper';

interface RouteProtectionWrapperProps {
  user: User;
  menuId: string;
  onRedirect: (tab: string) => void;
  children: React.ReactNode;
}

export default function RouteProtectionWrapper({
  user,
  menuId,
  onRedirect,
  children
}: RouteProtectionWrapperProps) {
  // Normalize menu ID for permissions check
  const getNormalizedMenuId = (id: string): string => {
    const normalized = id.toLowerCase();
    if (normalized === 'pustaka') return 'perpustakaan';
    if (normalized === 'sarpras') return 'inventaris';
    if (normalized === 'setting') return 'pengaturan';
    return normalized;
  };

  const normalizedId = getNormalizedMenuId(menuId);
  const isAuthorized = hasMenuAccess(user, normalizedId);

  if (isAuthorized) {
    return (
      <motion.div
        key={menuId}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full"
      >
        {children}
      </motion.div>
    );
  }

  // Find human-readable menu label
  const menuConfig = AVAILABLE_MENUS.find(m => m.id === normalizedId);
  const menuLabel = menuConfig ? menuConfig.label : menuId.charAt(0).toUpperCase() + menuId.slice(1);

  // Get what menus this user DOES have access to
  const matrix = getPermissionsMatrix();
  const userRole = user.role.replace(' ', '_').toUpperCase();
  const roleConfig = matrix[userRole];
  const allowedMenus = roleConfig ? roleConfig.menus : [];
  
  const allowedMenuNames = AVAILABLE_MENUS
    .filter(m => allowedMenus.includes(m.id))
    .map(m => m.label);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-center justify-center min-h-[50vh] p-4 md:p-8"
      id="route-protection-wrapper"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* Warning Banner */}
        <div className="bg-amber-50 border-b border-amber-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-amber-700 bg-amber-100/60 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Sistem Keamanan ERP
            </span>
            <h3 className="text-lg font-black text-slate-800 tracking-tight mt-1 font-display">
              AKSES DITOLAK (ACCESS DENIED)
            </h3>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-3">
            <p className="text-slate-600 text-sm leading-relaxed">
              Maaf, akun Anda (<b>{user.name}</b>) dengan peran <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono">{user.role}</span> tidak memiliki izin otorisasi untuk membuka modul <span className="font-extrabold text-blue-600">"{menuLabel}"</span>.
            </p>
            <p className="text-xs text-slate-400 leading-normal">
              Hak akses modul diatur secara berkala oleh Administrator Sekolah melalui Matriks Otorisasi di menu Pengaturan. Jika Anda merasa hal ini adalah kesalahan, harap hubungi staf IT atau Operator Sekolah Anda.
            </p>
          </div>

          {/* Allowed Menus Information Section */}
          {allowedMenuNames.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Modul yang Diizinkan untuk Peran Anda:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {allowedMenuNames.map((name, idx) => (
                  <span 
                    key={idx}
                    className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => onRedirect('dashboard')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all hover:-translate-y-0.5 cursor-pointer"
              id="btn-redirect-dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </button>

            <button
              onClick={() => {
                onRedirect('pengaturan');
                // Trigger transition effect
                setTimeout(() => {
                  const ev = new CustomEvent('erp-subtab-change', {
                    detail: { tab: 'pengaturan', subTab: 'profil' }
                  });
                  window.dispatchEvent(ev);
                }, 100);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer"
              id="btn-redirect-profile"
            >
              <Lock className="w-3.5 h-3.5" />
              Lihat Profil Saya
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50/50 border-t border-slate-100 px-8 py-3.5 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>ID Sesi: {user.id}</span>
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-300" /> Bantuan Teknis
          </span>
        </div>
      </div>
    </motion.div>
  );
}
