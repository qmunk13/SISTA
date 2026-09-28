import { db } from '../data/db';
import { AuditLogItem } from '../data/auditSeed';
import { getActiveRole } from './permissions';

export interface SystemLogEntry {
  LogID: string;
  UserID: string;
  Username: string;
  Tanggal: string;
  Aktivitas: string;
  Modul: string;
  IP: string;
  Device: string;
  Browser: string;
  CreatedAt: string;
}

export interface AuditLogEntry {
  AuditID: string;
  UserID: string;
  Username: string;
  Tabel: string;
  RecordID: string;
  Field: string;
  ValueLama: string;
  ValueBaru: string;
  Tanggal: string;
  CreatedAt: string;
}

export interface SessionEntry {
  SessionID: string;
  UserID: string;
  Username: string;
  Token: string;
  IPAddress: string;
  Device: string;
  LoginAt: string;
  ExpiredAt: string;
  Status: string;
}

function getBrowserInfo(): { browser: string; device: string } {
  if (typeof navigator === 'undefined') {
    return { browser: 'Chrome / Web Browser', device: 'Desktop PC' };
  }
  const ua = navigator.userAgent;
  let browser = 'Web Browser';
  if (ua.includes('Chrome')) browser = 'Google Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (ua.includes('Edge')) browser = 'Microsoft Edge';

  let device = 'Desktop PC';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) device = 'Mobile / Tablet';
  else if (/Macintosh/i.test(ua)) device = 'Apple Mac';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Linux/i.test(ua)) device = 'Linux PC';

  return { browser, device };
}

export function logActivity(params: {
  user?: string;
  role?: string;
  modul: AuditLogItem['modul'] | string;
  aksi: AuditLogItem['aksi'] | string;
  target: string;
  rincian: string;
  status?: 'SUKSES' | 'PERINGATAN' | 'GAGAL';
  ipAddress?: string;
  tabel?: string;
  field?: string;
  valueLama?: string;
  valueBaru?: string;
}): void {
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timestampStr = `${dateStr} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const isoStr = now.toISOString();
    
    const activeRole = getActiveRole();
    const activeRoleName = activeRole?.namaRole || 'Administrator';
    const activeUserName = params.user || (typeof window !== 'undefined' && localStorage.getItem('auth_user_name')) || 'Administrator';
    const userId = (typeof window !== 'undefined' && localStorage.getItem('auth_user_id')) || 'USR-ADMIN';
    const { browser, device } = getBrowserInfo();
    const ip = params.ipAddress || '127.0.0.1';

    // 1. Audit Log Item
    const newAuditLog: AuditLogItem = {
      id: `AUDIT-${now.getTime()}-${Math.floor(Math.random() * 900) + 100}`,
      timestamp: timestampStr,
      user: activeUserName,
      role: params.role || activeRoleName,
      modul: params.modul as any,
      aksi: params.aksi as any,
      target: params.target,
      rincian: params.rincian,
      ipAddress: ip,
      status: params.status || 'SUKSES'
    };

    // 2. AUDIT_LOG schema record
    const auditRecord: AuditLogEntry = {
      AuditID: newAuditLog.id,
      UserID: userId,
      Username: activeUserName,
      Tabel: params.tabel || (String(params.modul).toUpperCase().replace(/[^A-Z0-9_]/g, '_')) || 'SISWA',
      RecordID: params.target || 'REC-001',
      Field: params.field || String(params.aksi || 'UPDATE'),
      ValueLama: params.valueLama || '-',
      ValueBaru: params.valueBaru || params.rincian || 'Selesai',
      Tanggal: dateStr,
      CreatedAt: isoStr
    };

    // 3. LOG schema record
    const logRecord: SystemLogEntry = {
      LogID: `LOG-${now.getTime()}-${Math.floor(Math.random() * 900) + 100}`,
      UserID: userId,
      Username: activeUserName,
      Tanggal: dateStr,
      Aktivitas: `[${params.aksi}] ${params.target}: ${params.rincian}`,
      Modul: String(params.modul || 'Sistem'),
      IP: ip,
      Device: device,
      Browser: browser,
      CreatedAt: isoStr
    };

    // Save to all collections consistently
    const currentAuditLogs = db.get<AuditLogItem>('audit_logs') || [];
    db.set('audit_logs', [newAuditLog, ...currentAuditLogs.slice(0, 499)]);

    const currentAuditRecords = db.get<AuditLogEntry>('audit_log') || [];
    db.set('audit_log', [auditRecord, ...currentAuditRecords.slice(0, 499)]);

    const currentLogs = db.get<SystemLogEntry>('logs') || [];
    db.set('logs', [logRecord, ...currentLogs.slice(0, 499)]);

    const currentActLogs = db.get<any>('activity_logs') || [];
    db.set('activity_logs', [logRecord, ...currentActLogs.slice(0, 499)]);
  } catch (err) {
    console.error('Failed to write audit & system log:', err);
  }
}

export function recordUserSession(user: { id?: string; name?: string; role?: string; username?: string }): void {
  try {
    const now = new Date();
    const exp = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { browser, device } = getBrowserInfo();
    const token = `tok_${Math.random().toString(36).substring(2, 12)}_${now.getTime().toString(36)}`;
    const userId = user.id || 'USR-ADMIN';
    const userName = user.name || user.username || 'Administrator';

    const session: SessionEntry = {
      SessionID: `SES-${now.getTime()}-${Math.floor(Math.random() * 900) + 100}`,
      UserID: userId,
      Username: userName,
      Token: token,
      IPAddress: '127.0.0.1',
      Device: `${device} (${browser})`,
      LoginAt: now.toISOString(),
      ExpiredAt: exp.toISOString(),
      Status: 'Aktif'
    };

    const currentSessions = db.get<SessionEntry>('session') || [];
    db.set('session', [session, ...currentSessions.slice(0, 99)]);
    db.set('sessions', [session, ...currentSessions.slice(0, 99)]);

    // Log the login activity
    logActivity({
      user: userName,
      role: user.role || 'Administrator',
      modul: 'Sistem & Keamanan',
      aksi: 'LOGIN',
      target: 'Sesi Autentikasi Pengguna',
      rincian: `Pengguna ${userName} berhasil masuk ke sistem dari ${device} via ${browser}`,
      tabel: 'SESSIONS',
      field: 'LoginAt',
      valueLama: '-',
      valueBaru: now.toISOString()
    });
  } catch (err) {
    console.error('Failed to record user session:', err);
  }
}

