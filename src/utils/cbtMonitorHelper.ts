import { db } from '../data/db';

export interface CbtLiveParticipant {
  studentId: string;
  examId: string;
  name: string;
  nisn: string;
  class: string;
  ip: string;
  device: string;
  loginTime: string;
  lastHeartbeat: string;
  totalSoal: number;
  terjawab: number;
  sisaDetik: number;
  status: 'Mengerjakan' | 'Selesai' | 'Peringatan' | 'Terkunci' | 'Belum Login';
  pelanggaranCount: number;
  pelanggaranList: {
    waktu: string;
    tipe: string;
    keterangan: string;
  }[];
  extraTimeMinutes?: number;
  forceFinished?: boolean;
  isUnlockedByProctor?: boolean;
  isLockedBySystem?: boolean;
  unlockedAt?: string;
}

export const CBT_MONITOR_KEY = 'cbt_live_monitoring';
export const CBT_VIOLATION_KEY = 'cbt_cheating_logs';

/**
 * Catat heartbeat saat siswa sedang membuka / mengerjakan CBT
 */
export function recordCbtHeartbeat(data: {
  studentId: string;
  examId: string;
  name: string;
  nisn: string;
  class: string;
  totalSoal: number;
  terjawab: number;
  sisaDetik: number;
  status?: 'Mengerjakan' | 'Selesai' | 'Peringatan';
}) {
  try {
    const list: CbtLiveParticipant[] = db.get(CBT_MONITOR_KEY) || [];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} WIB`;

    const existingIdx = list.findIndex(
      p => p.studentId === data.studentId && p.examId === data.examId
    );

    if (existingIdx >= 0) {
      const existing = list[existingIdx];
      const updated: CbtLiveParticipant = {
        ...existing,
        name: data.name || existing.name,
        nisn: data.nisn || existing.nisn,
        class: data.class || existing.class,
        totalSoal: data.totalSoal,
        terjawab: data.terjawab,
        sisaDetik: data.sisaDetik,
        lastHeartbeat: timeStr,
        status: data.status || (existing.pelanggaranCount > 0 ? 'Peringatan' : 'Mengerjakan')
      };
      list[existingIdx] = updated;
      db.set(CBT_MONITOR_KEY, [...list]);
    } else {
      const newParticipant: CbtLiveParticipant = {
        studentId: data.studentId,
        examId: data.examId,
        name: data.name,
        nisn: data.nisn,
        class: data.class,
        ip: '192.168.1.' + (100 + (Math.abs(data.studentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 150)),
        device: typeof navigator !== 'undefined' ? `${navigator.platform || 'Browser'} / ${navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser'}` : 'Perangkat Siswa',
        loginTime: timeStr,
        lastHeartbeat: timeStr,
        totalSoal: data.totalSoal,
        terjawab: data.terjawab,
        sisaDetik: data.sisaDetik,
        status: data.status || 'Mengerjakan',
        pelanggaranCount: 0,
        pelanggaranList: []
      };
      db.set(CBT_MONITOR_KEY, [newParticipant, ...list]);
    }
  } catch (err) {
    console.error('Failed to record CBT heartbeat:', err);
  }
}

/**
 * Catat pelanggaran kecurangan (Pindah Tab, Keluar Fullscreen, Klik Kanan, dll)
 */
export function recordCbtViolation(params: {
  studentId: string;
  examId: string;
  name: string;
  nisn: string;
  class: string;
  tipe: 'PINDAH_TAB' | 'KELUAR_FULLSCREEN' | 'KLIK_KANAN' | 'SHORTCUT_DEVTOOLS' | 'COPY_PASTE';
  keterangan: string;
}): { newViolationCount: number; shouldLockExam: boolean } {
  try {
    const list: CbtLiveParticipant[] = db.get(CBT_MONITOR_KEY) || [];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} WIB`;

    let newViolationCount = 1;
    let shouldLock = false;

    const existingIdx = list.findIndex(
      p => p.studentId === params.studentId && p.examId === params.examId
    );

    const violationEntry = {
      waktu: timeStr,
      tipe: params.tipe,
      keterangan: params.keterangan
    };

    if (existingIdx >= 0) {
      const existing = list[existingIdx];
      newViolationCount = (existing.pelanggaranCount || 0) + 1;
      shouldLock = newViolationCount >= 3;

      list[existingIdx] = {
        ...existing,
        status: 'Peringatan',
        pelanggaranCount: newViolationCount,
        pelanggaranList: [violationEntry, ...(existing.pelanggaranList || [])]
      };
      db.set(CBT_MONITOR_KEY, [...list]);
    } else {
      newViolationCount = 1;
      const newParticipant: CbtLiveParticipant = {
        studentId: params.studentId,
        examId: params.examId,
        name: params.name,
        nisn: params.nisn,
        class: params.class,
        ip: '192.168.1.101',
        device: 'Perangkat Siswa',
        loginTime: timeStr,
        lastHeartbeat: timeStr,
        totalSoal: 25,
        terjawab: 0,
        sisaDetik: 1800,
        status: 'Peringatan',
        pelanggaranCount: 1,
        pelanggaranList: [violationEntry]
      };
      db.set(CBT_MONITOR_KEY, [newParticipant, ...list]);
    }

    // Catat juga ke log permanen kecurangan (cbt_cheating_logs)
    const logs = db.get(CBT_VIOLATION_KEY) || [];
    const logItem = {
      id: `VIO-${Date.now()}`,
      examId: params.examId,
      studentId: params.studentId,
      name: params.name,
      class: params.class,
      nisn: params.nisn,
      tipe: params.tipe,
      keterangan: params.keterangan,
      waktu: timeStr,
      timestamp: new Date().toISOString()
    };
    db.set(CBT_VIOLATION_KEY, [logItem, ...(Array.isArray(logs) ? logs : [])]);

    return { newViolationCount, shouldLockExam: shouldLock };
  } catch (e) {
    console.error('Failed to record CBT violation:', e);
    return { newViolationCount: 1, shouldLockExam: false };
  }
}

/**
 * Tambah waktu pengerjaan dari Proktor
 */
export function addCbtExtraTime(studentId: string, examId: string, minutes: number) {
  const list: CbtLiveParticipant[] = db.get(CBT_MONITOR_KEY) || [];
  const updated = list.map(p => {
    if (p.studentId === studentId && (!examId || p.examId === examId)) {
      return {
        ...p,
        extraTimeMinutes: (p.extraTimeMinutes || 0) + minutes,
        sisaDetik: (p.sisaDetik || 0) + minutes * 60
      };
    }
    return p;
  });
  db.set(CBT_MONITOR_KEY, updated);
}

/**
 * Paksa selesai ujian siswa dari Proktor
 */
export function forceFinishCbtExam(studentId: string, examId: string) {
  const list: CbtLiveParticipant[] = db.get(CBT_MONITOR_KEY) || [];
  const updated = list.map(p => {
    if (p.studentId === studentId && (!examId || p.examId === examId)) {
      return {
        ...p,
        status: 'Selesai' as const,
        forceFinished: true,
        sisaDetik: 0
      };
    }
    return p;
  });
  db.set(CBT_MONITOR_KEY, updated);
}

/**
 * Reset pelanggaran / sesi login dan buka kembali ujian siswa yang terkunci oleh Proktor
 */
export function resetCbtStudentStatus(studentId: string, examId?: string) {
  try {
    const list: CbtLiveParticipant[] = db.get(CBT_MONITOR_KEY) || [];
    const updated = list.map(p => {
      if (p.studentId === studentId && (!examId || p.examId === examId)) {
        return {
          ...p,
          status: 'Mengerjakan' as const,
          pelanggaranCount: 0,
          pelanggaranList: [],
          forceFinished: false,
          isUnlockedByProctor: true,
          isLockedBySystem: false,
          unlockedAt: new Date().toISOString()
        };
      }
      return p;
    });
    db.set(CBT_MONITOR_KEY, updated);

    // Bersihkan catatan pelanggaran aktif siswa ini agar tidak terkunci lagi
    const violationLogs = db.get(CBT_VIOLATION_KEY) || [];
    if (Array.isArray(violationLogs)) {
      const filtered = violationLogs.filter((v: any) => !(v.studentId === studentId && (!examId || v.examId === examId)));
      db.set(CBT_VIOLATION_KEY, filtered);
    }

    // Catat token buka kunci proktor
    const unlockMap = (db.get('cbt_unlocked_students') || {}) as Record<string, any>;
    unlockMap[studentId] = {
      unlockedAt: Date.now(),
      examId: examId || 'ALL',
      message: 'Kunci ujian telah dibuka kembali oleh Pengawas / Proktor'
    };
    db.set('cbt_unlocked_students', unlockMap);

    // Broadcast ke tab ujian siswa
    window.dispatchEvent(new CustomEvent('cbt-student-unlocked', { detail: { studentId, examId } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: CBT_MONITOR_KEY } }));
  } catch (err) {
    console.error('Error reset / unlock student:', err);
  }
}

export const resetCbtStudent = resetCbtStudentStatus;
export const unlockAndResetCbtStudent = resetCbtStudentStatus;
