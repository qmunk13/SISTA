import { db, getNormalizedStatus } from '../data/db';
import { parseAllSiswa } from '../data/parser';
import { Siswa, User, Guru } from '../types';

export interface SyncStats {
  addedCount: number;
  updatedCount: number;
  totalSynced: number;
}

/**
 * Normalizes student status strings into strict schema status enum values.
 */
export function normalizeStudentStatus(status?: string): 'AKTIF' | 'TIDAK AKTIF' | 'BELUM' | 'PINDAH' | 'KELUAR' | 'LULUS' {
  return getNormalizedStatus(status);
}

/**
 * Propagates Status and Kelas updates back to the master SISWA collection
 * and triggers global event notifications.
 */
export function updateStudentStatusAndClass(
  studentIdOrPdkt: string,
  updates: { status?: string; kelasId?: string; kelas?: string; kelasSaatIni?: string }
): boolean {
  if (!studentIdOrPdkt) return false;
  const targetKey = studentIdOrPdkt.trim().toUpperCase();
  const siswaList = db.get<Siswa>('siswa') || [];

  let modified = false;
  const updatedList = siswaList.map((s) => {
    const sId = (s.id || '').trim().toUpperCase();
    const sPdkt = (s.noPdkt || '').trim().toUpperCase();
    const sNisn = (s.nisn || '').trim().toUpperCase();

    if (sId === targetKey || sPdkt === targetKey || sNisn === targetKey) {
      modified = true;
      const normStatus = updates.status ? getNormalizedStatus(updates.status) : s.status;
      const targetKelas = updates.kelasId || updates.kelas || updates.kelasSaatIni || s.kelasId;
      
      const newClassHistory = {
        ...(s.classHistory || {}),
      };
      if (targetKelas) {
        newClassHistory['2026/2027'] = targetKelas;
      }

      return {
        ...s,
        status: normStatus,
        kelasId: targetKelas || s.kelasId,
        kelas: targetKelas || s.kelas,
        kelasSaatIni: targetKelas || s.kelasSaatIni,
        classHistory: newClassHistory,
      };
    }
    return s;
  });

  if (modified) {
    db.set('siswa', updatedList);
    window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'siswa' } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'siswa', val: updatedList } }));
  }

  return modified;
}

/**
 * Automatically synchronizes student profiles and classroom assignments
 * between master data sources and the live database.
 * Preserves all live edits made in the ERP system while merging duplicate noPdkt entries.
 */
export function runBackgroundStudentSync(): SyncStats {
  const stats: SyncStats = {
    addedCount: 0,
    updatedCount: 0,
    totalSynced: 0
  };

  // Skip auto background sync if manually purged clean by admin
  if (localStorage.getItem('ERP_siswa_purged_all') === 'true') {
    return stats;
  }

  try {
    const liveSiswaList = db.get<Siswa>('siswa') || [];
    const masterSiswaList = parseAllSiswa() || [];

    // Deduplicate and normalize live list first based on noPdkt / ID / NISN
    const updatedSiswaList: Siswa[] = [];
    const seenPdkt = new Set<string>();

    for (const item of liveSiswaList) {
      if (!item) continue;
      const pdktKey = (item.noPdkt || item.id || item.nisn || '').toString().trim().toUpperCase();
      const normStatus = getNormalizedStatus(item.status);
      item.status = normStatus;

      if (pdktKey && seenPdkt.has(pdktKey)) {
        // Merge duplicate nopdkt entry into existing record
        const existing = updatedSiswaList.find(s => 
          (s.noPdkt || s.id || s.nisn || '').toString().trim().toUpperCase() === pdktKey
        );
        if (existing) {
          Object.keys(item).forEach(k => {
            const exVal = (existing as any)[k];
            const itemVal = (item as any)[k];
            if ((exVal === undefined || exVal === '' || exVal === null) && itemVal !== undefined && itemVal !== '') {
              (existing as any)[k] = itemVal;
            }
          });
          // Merge class history
          if (item.classHistory) {
            existing.classHistory = {
              ...(item.classHistory || {}),
              ...(existing.classHistory || {}),
            };
          }
        }
        continue;
      }

      if (pdktKey) seenPdkt.add(pdktKey);
      updatedSiswaList.push(item);
    }

    let isDbModified = false;

    for (const masterSiswa of masterSiswaList) {
      if (!masterSiswa) continue;
      masterSiswa.status = getNormalizedStatus(masterSiswa.status);

      // Find existing student by ID, PDKT code, or NISN
      const existingIndex = updatedSiswaList.findIndex(
        (s) => (s.id && masterSiswa.id && s.id.trim().toUpperCase() === masterSiswa.id.trim().toUpperCase()) || 
               (s.noPdkt && masterSiswa.noPdkt && s.noPdkt.trim().toUpperCase() === masterSiswa.noPdkt.trim().toUpperCase()) || 
               (s.nisn && masterSiswa.nisn && s.nisn.trim() === masterSiswa.nisn.trim())
      );

      if (existingIndex === -1) {
        // Not found in local database: Add as new student
        updatedSiswaList.push(masterSiswa);
        stats.addedCount++;
        isDbModified = true;
      } else {
        const existingSiswa = updatedSiswaList[existingIndex];
        let isStudentModified = false;

        // Fields to complement if currently empty in live database
        const syncFields: (keyof Siswa)[] = [
          'nama',
          'jk',
          'status',
          'kelasId',
          'tahunMasuk',
          'tempatLahir',
          'tglLahir',
          'nik',
          'noHp',
          'email',
          'asalSekolah',
          'noKk',
          'namaAyah',
          'nikAyah',
          'tempatLahirAyah',
          'tglLahirAyah',
          'pekerjaanAyah',
          'tlpAyah',
          'namaIbu',
          'nikIbu',
          'tempatLahirIbu',
          'tglLahirIbu',
          'pekerjaanIbu'
        ];

        const updatedStudentObj = { ...existingSiswa };

        for (const field of syncFields) {
          const masterVal = masterSiswa[field];
          const existingVal = existingSiswa[field];

          // Fill in missing empty fields from master data without overwriting live values
          if (masterVal !== undefined && masterVal !== '' && (existingVal === undefined || existingVal === '' || existingVal === null)) {
            (updatedStudentObj as any)[field] = masterVal;
            isStudentModified = true;
          }
        }

        // Merge classHistory without losing existing entries
        if (masterSiswa.classHistory) {
          const mergedHistory = { 
            ...(masterSiswa.classHistory || {}),
            ...(existingSiswa.classHistory || {})
          };
          if (JSON.stringify(existingSiswa.classHistory) !== JSON.stringify(mergedHistory)) {
            updatedStudentObj.classHistory = mergedHistory;
            isStudentModified = true;
          }
        }

        if (isStudentModified) {
          updatedSiswaList[existingIndex] = updatedStudentObj;
          stats.updatedCount++;
          isDbModified = true;
        }
      }
    }

    if (isDbModified) {
      db.set('siswa', updatedSiswaList);
    }

    // Auto-sync user accounts for students and teachers
    syncUserAccountsFromMasterData();

    stats.totalSynced = updatedSiswaList.length;
  } catch (error) {
    console.error('Failed to run automatic background student synchronization:', error);
  }

  return stats;
}

import { StorageService } from '../services/storageService';

/**
 * Ensures every active student and teacher has a corresponding account in USERS table.
 * Aturan Password Siswa: Nama depan sebelum spasi (lowercase) + Nomor PDKT (contoh: asep036).
 */
export function syncUserAccountsFromMasterData(): void {
  try {
    const liveUsers = db.get<any>('users') || [];
    const liveSiswa = db.get<any>('siswa') || db.get<any>('students') || [];
    const liveGuru = db.get<Guru>('guru') || [];

    const userMap = new Map<string, any>();
    const pdktToKeyMap = new Map<string, string>();
    let isUsersModified = false;

    // Seed existing users into O(1) map, supporting both lowercase and PascalCase sheet properties
    for (const rawU of liveUsers) {
      if (!rawU) continue;
      const uName = String(rawU.username || rawU.Username || '').trim();
      if (!uName) continue;
      const uKey = uName.toLowerCase();
      if (userMap.has(uKey)) {
        // Deduplicate any previously inflated records
        isUsersModified = true;
        continue;
      }
      const roleVal = rawU.role || (rawU.RoleID === 'RL-026' ? 'SISWA' : rawU.RoleID === 'RL-027' ? 'ORANG_TUA' : rawU.RoleID === 'RL-019' ? 'GURU' : rawU.RoleID || 'ADMIN');
      const normalizedExisting = {
        ...rawU,
        id: rawU.id || rawU.UserID || `USR_${uName}`,
        UserID: rawU.UserID || rawU.id || `USR_${uName}`,
        username: uName,
        Username: uName,
        nopdkt: rawU.nopdkt || rawU.NIP_NISN || '',
        NIP_NISN: rawU.NIP_NISN || rawU.nopdkt || uName,
        email: rawU.email || rawU.Email || `${uKey}@rombeltambora.sch.id`,
        Email: rawU.Email || rawU.email || `${uKey}@rombeltambora.sch.id`,
        password: rawU.password || rawU.Password || '123456',
        Password: rawU.Password || rawU.password || '123456',
        role: roleVal,
        RoleID: roleVal === 'SISWA' ? 'RL-026' : roleVal === 'ORANG_TUA' ? 'RL-027' : roleVal === 'GURU' ? 'RL-019' : 'RL-001',
        name: rawU.name || rawU.Nama || rawU.nama || 'User',
        Nama: rawU.Nama || rawU.name || rawU.nama || 'User',
        status: rawU.status || rawU.Status || 'AKTIF',
        Status: rawU.Status || rawU.status || 'AKTIF'
      };
      userMap.set(uKey, normalizedExisting);
      if (normalizedExisting.nopdkt && roleVal === 'SISWA') {
        pdktToKeyMap.set(String(normalizedExisting.nopdkt).toLowerCase(), uKey);
      }
    }

    const storageUsersToBatch: any[] = [];
    const storagePasswordsToBatch: Record<string, string> = {};
    const nowIso = new Date().toISOString();

    // 1. Sync Student Accounts & 2. Parent Accounts in a single O(N) pass
    for (const s of liveSiswa) {
      if (!s) continue;
      const rawName = (s.nama || s.name || s.NamaLengkap || s.Nama || 'Siswa').trim();
      const firstName = rawName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const pdkt = (s.noPdkt || s.nopdkt || s.NoPDKT || s.nis || s.NIS || s.id || '').toString().trim().replace(/^pdkt-?/i, '');
      const sharedPassword = `${firstName}${pdkt || (s.nisn ? s.nisn.slice(-3) : '123')}`;

      const username = (s.nisn || pdkt || s.id || '').toString().trim();
      if (!username) continue;
      const usernameLower = username.toLowerCase();
      const currentStatus = (s.status || s.Status || 'Aktif').toString().trim();
      const studentEmail = s.email || `${usernameLower}@siswa.sch.id`;
      const studentId = `USR_${s.id || username}`;

      const existingKey = userMap.has(usernameLower)
        ? usernameLower
        : (pdkt && pdktToKeyMap.get(pdkt.toLowerCase())) || '';
      const existingStudent = existingKey ? userMap.get(existingKey) : undefined;

      if (!existingStudent) {
        const newStudentUser = {
          id: studentId,
          UserID: studentId,
          username,
          Username: username,
          nopdkt: pdkt,
          NIP_NISN: s.nisn || pdkt || username,
          email: studentEmail,
          Email: studentEmail,
          password: sharedPassword,
          Password: sharedPassword,
          role: 'SISWA',
          RoleID: 'RL-026',
          name: rawName,
          Nama: rawName,
          NoHP: s.noHp || s.phone || '',
          status: currentStatus,
          Status: currentStatus,
          CreatedAt: nowIso,
          UpdatedAt: nowIso
        };
        userMap.set(usernameLower, newStudentUser);
        if (pdkt) pdktToKeyMap.set(pdkt.toLowerCase(), usernameLower);
        isUsersModified = true;
      } else if (existingStudent.role === 'SISWA') {
        if (
          existingStudent.password !== sharedPassword ||
          existingStudent.nopdkt !== pdkt ||
          existingStudent.name !== rawName ||
          existingStudent.status !== currentStatus
        ) {
          existingStudent.password = sharedPassword;
          existingStudent.Password = sharedPassword;
          existingStudent.nopdkt = pdkt;
          existingStudent.NIP_NISN = s.nisn || pdkt || username;
          existingStudent.name = rawName;
          existingStudent.Nama = rawName;
          existingStudent.status = currentStatus;
          existingStudent.Status = currentStatus;
          existingStudent.UpdatedAt = nowIso;
          isUsersModified = true;
        }
      }

      if (s.nisn) storagePasswordsToBatch[s.nisn] = sharedPassword;
      if (pdkt) storagePasswordsToBatch[pdkt] = sharedPassword;
      storageUsersToBatch.push({
        idUser: studentId,
        username,
        nama: rawName,
        role: 'SISWA',
        status: currentStatus,
        kelas: s.kelas || s.class,
        nopdkt: pdkt,
        twoFactorEnabled: false
      });

      // Parent account
      const parentUsername = `ortu_${username}`;
      const parentUsernameLower = parentUsername.toLowerCase();
      const ortuPdktLower = pdkt ? `ortu_${pdkt.toLowerCase()}` : '';
      const parentName = (s.NamaAyah || s.namaAyah || s.NamaIbu || s.namaIbu || s.NamaWali || s.namaWali || s.parentName || `Orang Tua dari ${rawName}`).trim();
      const parentId = `USR_ORTU_${s.id || username}`;
      const parentEmail = s.emailOrtu || `${usernameLower}@ortu.sch.id`;

      const existingParent = userMap.get(parentUsernameLower) || (ortuPdktLower ? userMap.get(ortuPdktLower) : undefined);
      if (!existingParent) {
        userMap.set(parentUsernameLower, {
          id: parentId,
          UserID: parentId,
          username: parentUsername,
          Username: parentUsername,
          nopdkt: pdkt,
          NIP_NISN: s.nisn || pdkt || username,
          email: parentEmail,
          Email: parentEmail,
          password: sharedPassword,
          Password: sharedPassword,
          role: 'ORANG_TUA',
          RoleID: 'RL-027',
          name: parentName,
          Nama: parentName,
          NoHP: s.noHp || s.phone || '',
          status: currentStatus,
          Status: currentStatus,
          CreatedAt: nowIso,
          UpdatedAt: nowIso
        });
        isUsersModified = true;
      } else if (existingParent.role === 'ORANG_TUA') {
        if (
          existingParent.password !== sharedPassword ||
          existingParent.nopdkt !== pdkt ||
          existingParent.name !== parentName ||
          existingParent.status !== currentStatus
        ) {
          existingParent.password = sharedPassword;
          existingParent.Password = sharedPassword;
          existingParent.nopdkt = pdkt;
          existingParent.NIP_NISN = s.nisn || pdkt || username;
          existingParent.name = parentName;
          existingParent.Nama = parentName;
          existingParent.status = currentStatus;
          existingParent.Status = currentStatus;
          existingParent.UpdatedAt = nowIso;
          isUsersModified = true;
        }
      }

      storagePasswordsToBatch[parentUsername] = sharedPassword;
      storageUsersToBatch.push({
        idUser: parentId,
        username: parentUsername,
        nama: parentName,
        role: 'ORANG_TUA',
        status: 'AKTIF',
        kelas: s.kelas || s.class,
        nopdkt: pdkt,
        twoFactorEnabled: false
      });
    }

    // 3. Sync Teacher Accounts in O(1) per teacher
    for (const g of liveGuru) {
      if (!g) continue;
      const username = (g.nip || g.email || g.id || '').toString().trim();
      if (!username) continue;
      const usernameLower = username.toLowerCase();

      if (!userMap.has(usernameLower)) {
        const gStatus = String(g.status || '').toUpperCase() === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF';
        const gEmail = g.email || `${usernameLower}@guru.sch.id`;
        const gName = g.nama || (g as any).name || 'Guru';
        const gId = `USR_${g.id || username}`;
        userMap.set(usernameLower, {
          id: gId,
          UserID: gId,
          username,
          Username: username,
          NIP_NISN: g.nip || username,
          email: gEmail,
          Email: gEmail,
          password: 'admin123',
          Password: 'admin123',
          role: 'GURU',
          RoleID: 'RL-019',
          name: gName,
          Nama: gName,
          NoHP: (g as any).phone || (g as any).noHp || '',
          status: gStatus,
          Status: gStatus,
          CreatedAt: nowIso,
          UpdatedAt: nowIso
        });
        isUsersModified = true;
      }
    }

    if (isUsersModified) {
      try {
        if (storageUsersToBatch.length > 0) {
          StorageService.saveUsersBatch(storageUsersToBatch);
        }
        if (Object.keys(storagePasswordsToBatch).length > 0) {
          StorageService.setPasswordsBatch(storagePasswordsToBatch);
        }
      } catch {}

      const finalUsers = Array.from(userMap.values());
      db.set('users', finalUsers, { skipPush: true });
      db.set('master_users', finalUsers, { skipPush: true });
    }
  } catch (err) {
    console.error('Failed to sync user accounts from master data:', err);
  }
}

