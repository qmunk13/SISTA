import { db } from '../data/db';

export interface AuditLog {
  id: string;
  user: string;
  role: string;
  action: string;
  timestamp: string;
}

export function logActivity(username: string, role: string, action: string) {
  const logs = db.get<AuditLog>('audit_logs') || [];
  const newLog: AuditLog = {
    id: `AUD_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user: username,
    role: role,
    action: action,
    timestamp: new Date().toLocaleString('id-ID', { hour12: false })
  };
  logs.unshift(newLog); // Put newest logs first
  // Keep only last 100 logs
  if (logs.length > 100) {
    logs.splice(100);
  }
  db.set('audit_logs', logs);
  
  // Dispatch a custom event to notify components of real-time update
  window.dispatchEvent(new CustomEvent('erp_audit_log_added', { detail: newLog }));
}

export function getAuditLogs(): AuditLog[] {
  const logs = db.get<AuditLog>('audit_logs') || [];
  if (logs.length === 0) {
    // Seed some initial audit logs
    const seed: AuditLog[] = [
      { id: 'AUD_1', user: 'superadmin', role: 'SUPERADMIN', action: 'Login berhasil ke dalam Sistem ERP', timestamp: '15/07/2026, 08:30:11' },
      { id: 'AUD_2', user: 'admin', role: 'ADMIN', action: 'Memperbarui konfigurasi utama sekolah', timestamp: '15/07/2026, 09:12:45' },
      { id: 'AUD_3', user: 'bendahara', role: 'BENDAHARA', action: 'Mencatat transaksi SPP baru untuk kelas 12', timestamp: '15/07/2026, 10:05:30' },
      { id: 'AUD_4', user: 'guru_rpl', role: 'GURU', action: 'Mengisi nilai ujian CBT Pemrograman Web', timestamp: '15/07/2026, 11:24:15' }
    ];
    db.set('audit_logs', seed);
    return seed;
  }
  return logs;
}
