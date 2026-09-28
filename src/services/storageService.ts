import {
  UserAccount,
  StudentProfile,
  QuestionItem,
  ExamSchedule,
  ExamSubmission,
  ViolationRecord,
  NotificationItem,
  IndividualStatAnalysis,
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_USERS,
  INITIAL_SCHEDULES,
  INITIAL_QUESTIONS,
  INITIAL_SUBMISSIONS,
  INITIAL_VIOLATIONS,
  INITIAL_NOTIFICATIONS,
} from '../data/mockData';
import { SpreadsheetService } from './spreadsheetService';
import { idbGet, idbSet } from '../data/idbStorage';

const KEYS = {
  USERS: 'KTCT_USERS_V1',
  STUDENTS: 'KTCT_STUDENTS_V1',
  SCHEDULES: 'KTCT_SCHEDULES_V1',
  QUESTIONS: 'KTCT_QUESTIONS_V1',
  SUBMISSIONS: 'KTCT_SUBMISSIONS_V1',
  VIOLATIONS: 'KTCT_VIOLATIONS_V1',
  NOTIFICATIONS: 'KTCT_NOTIFICATIONS_V1',
  SESSION: 'KTCT_CURRENT_SESSION_V1',
  PASSWORDS: 'KTCT_PASSWORDS_V1',
};

// In-memory cache to guarantee instant, synchronous access and 0% data loss
const memoryStore = new Map<string, any>();

// Clean up stale or duplicate keys from localStorage when quota is constrained
function evictJunkStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Stale or duplicate synonym keys, old logs, temporary imports
      if (
        k.startsWith('audit_') ||
        k.startsWith('erp_log_') ||
        k === 'erp_TAGIHAN' ||
        k === 'erp_bills' ||
        k === 'erp_PEMBAYARAN' ||
        k === 'erp_INVOICE' ||
        k === 'erp_TABUNGAN' ||
        k === 'erp_KAS' ||
        k.includes('__temp_') ||
        k.startsWith('temp_')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {}
}

// Pre-hydrate from IndexedDB on startup
if (typeof window !== 'undefined') {
  Object.values(KEYS).forEach((k) => {
    idbGet(k).then((val) => {
      if (val !== null && val !== undefined) {
        memoryStore.set(k, val);
      }
    }).catch(() => {});
  });
}

// Default passwords for demo
const DEFAULT_PASSWORDS: Record<string, string> = {
  admin: 'admin123',
  guru: 'guru123',
  ortu: 'ortu123',
  '0081234501': 'ahmad001',
  '0081234502': 'siti002',
  '0081234503': 'rian003',
  '0081234504': 'dewi004',
  '0081234505': 'rizky005',
  '0081234506': 'nabila006',
  '0081234507': 'bagus007',
};

function getStored<T>(key: string, fallback: T): T {
  if (memoryStore.has(key)) {
    const val = memoryStore.get(key);
    if (val !== undefined && val !== null) return val as T;
  }
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (parsed && typeof parsed === 'object' && parsed.__idb_backed) {
      // IndexedDB-backed marker: load from IDB asynchronously
      idbGet<T>(key).then((idbVal) => {
        if (idbVal !== null && idbVal !== undefined) {
          memoryStore.set(key, idbVal);
          window.dispatchEvent(new CustomEvent('ktct_storage_change', { detail: { key } }));
        }
      }).catch(() => {});
      return fallback;
    }
    memoryStore.set(key, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  // 1. Immediately store in memory so components have instant, synchronous state
  memoryStore.set(key, value);

  // 2. Persist to high-capacity IndexedDB (effectively unlimited storage)
  try {
    idbSet(key, value).catch(() => {});
  } catch {}

  // 3. Safe localStorage persistence with QuotaExceeded protection
  if (typeof window !== 'undefined') {
    try {
      const jsonStr = JSON.stringify(value);
      if (jsonStr.length > 120000) {
        // Large payload: write a lightweight IDB marker to prevent 5MB localStorage exhaustion
        const marker = {
          __idb_backed: true,
          key,
          length: Array.isArray(value) ? value.length : Object.keys(value || {}).length,
          savedAt: Date.now()
        };
        try {
          localStorage.setItem(key, JSON.stringify(marker));
        } catch {
          evictJunkStorage();
          try {
            localStorage.setItem(key, JSON.stringify(marker));
          } catch {}
        }
      } else {
        localStorage.setItem(key, jsonStr);
      }
    } catch {
      // LocalStorage Quota Exceeded: evict junk and retry with lightweight marker
      try {
        evictJunkStorage();
        const marker = {
          __idb_backed: true,
          key,
          savedAt: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(marker));
      } catch {
        // Non-fatal: memoryStore & IndexedDB maintain full durability
        console.warn(`[StorageService] Storage quota reached for ${key}. Preserved in IndexedDB and memoryStore.`);
      }
    }
  }

  // Asynchronously dispatch custom storage event to prevent updating React component state during another component render
  setTimeout(() => {
    try {
      window.dispatchEvent(new CustomEvent('ktct_storage_change', { detail: { key } }));
    } catch {}
  }, 0);
}

export function normalizeJenjang(val: any, kelas?: string): 'Paket A' | 'Paket B' | 'Paket C' {
  if (val === 'Paket A' || val === 'Paket B' || val === 'Paket C') return val;
  const str = String(val || '').toUpperCase();
  if (str.includes('PAKET A') || str === 'SD') return 'Paket A';
  if (str.includes('PAKET B') || str === 'SMP') return 'Paket B';
  if (str.includes('PAKET C') || str === 'SMA' || str === 'SMK') return 'Paket C';
  if (kelas) {
    const k = String(kelas).toLowerCase();
    if (k.includes('paket a') || ['1', '2', '3', '4', '5', '6'].includes(k)) return 'Paket A';
    if (k.includes('paket b') || ['7', '8', '9'].includes(k)) return 'Paket B';
    if (k.includes('paket c') || ['10', '11', '12'].includes(k)) return 'Paket C';
  }
  return 'Paket B';
}

export function sanitizeStudent(s: StudentProfile): StudentProfile {
  if (!s) return s;
  const norm = normalizeJenjang(s.jenjang, s.kelas);

  // Preserve real photos (Google Drive, data URL, school domain), purge fake unsplash photos
  let foto = (s.linkFoto || s.pasFoto || '').trim();
  if (
    foto.includes('images.unsplash.com') ||
    foto.includes('photo-1507003211169') ||
    foto.includes('photo-1534528741775') ||
    foto.includes('photo-1539571696357')
  ) {
    foto = '';
  }

  // Detect if waliMurid was mistakenly filled with family status like 'Yatim' / 'Lengkap'
  const statusWords = ['yatim', 'lengkap', 'piatu', 'yatim piatu', 'ada', 'tidak ada'];
  let currentWali = (s.waliMurid || '').trim();
  let statusYatim = s.statusYatim || 'Lengkap';

  if (statusWords.includes(currentWali.toLowerCase())) {
    statusYatim = currentWali.charAt(0).toUpperCase() + currentWali.slice(1).toLowerCase();
    const ayah = (s.namaAyah || '').trim();
    const ibu = (s.namaIbu || '').trim();
    if (ayah && !statusWords.includes(ayah.toLowerCase()) && ayah.toLowerCase() !== 'ayah') {
      currentWali = ayah;
    } else if (ibu && !statusWords.includes(ibu.toLowerCase()) && ibu.toLowerCase() !== 'ibu') {
      currentWali = ibu;
    } else {
      currentWali = '-';
    }
  }

  const clean: any = {
    ...s,
    jenjang: norm,
    linkFoto: foto,
    pasFoto: foto,
    statusYatim,
    waliMurid: currentWali || '-',
    teleponWali: s.teleponWali || '-',
  };

  // Ensure no undefined keys exist
  for (const k of Object.keys(clean)) {
    if (clean[k] === undefined) {
      delete clean[k];
    }
  }

  return clean as StudentProfile;
}

export const StorageService = {
  init() {
    evictJunkStorage();
    if (!localStorage.getItem(KEYS.USERS)) {
      setStored(KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(KEYS.STUDENTS)) {
      setStored(KEYS.STUDENTS, INITIAL_STUDENTS);
    }
    const currentSchedules = getStored<ExamSchedule[]>(KEYS.SCHEDULES, []);
    if (
      !localStorage.getItem(KEYS.SCHEDULES) ||
      currentSchedules.length < 50 ||
      currentSchedules.some((s) => s.idJadwal.startsWith('JAD-'))
    ) {
      setStored(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    }
    if (!localStorage.getItem(KEYS.QUESTIONS)) {
      setStored(KEYS.QUESTIONS, INITIAL_QUESTIONS);
    }
    if (!localStorage.getItem(KEYS.SUBMISSIONS)) {
      setStored(KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
    }
    if (!localStorage.getItem(KEYS.VIOLATIONS)) {
      setStored(KEYS.VIOLATIONS, INITIAL_VIOLATIONS);
    }
    if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
      setStored(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    }
    if (!localStorage.getItem(KEYS.PASSWORDS)) {
      setStored(KEYS.PASSWORDS, DEFAULT_PASSWORDS);
    }

    // One-time safe data migration for Jenjang Paket A, B, C
    try {
      const currentStudents = getStored<StudentProfile[]>(KEYS.STUDENTS, []);
      if (currentStudents.length > 0) {
        let changed = false;
        const normalized = currentStudents.map((s) => {
          const norm = normalizeJenjang(s.jenjang, s.kelas);
          if (s.jenjang !== norm) {
            changed = true;
            return { ...s, jenjang: norm };
          }
          return s;
        });
        if (changed) {
          localStorage.setItem(KEYS.STUDENTS, JSON.stringify(normalized));
        }
      }

      const currentSchedList = getStored<ExamSchedule[]>(KEYS.SCHEDULES, []);
      if (currentSchedList.length > 0) {
        let changed = false;
        const normalized = currentSchedList.map((s) => {
          const norm = normalizeJenjang(s.jenjang, s.kelas);
          if (s.jenjang !== norm) {
            changed = true;
            return { ...s, jenjang: norm };
          }
          return s;
        });
        if (changed) {
          localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(normalized));
        }
      }
    } catch (e) {
      console.warn('Migration error:', e);
    }

    // Launch background sync with Google Spreadsheet
    this.syncFromSpreadsheet();
  },

  /**
   * Tarik & sinkronkan data siswa langsung dari Google Spreadsheet tab SISWA
   */
  async syncFromSpreadsheet(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const sheetStudents = await SpreadsheetService.fetchStudents();
      if (sheetStudents && sheetStudents.length > 0) {
        const sanitized = sheetStudents.map(sanitizeStudent);
        const existing = this.getStudents();

        // Gabungkan: jika data dari spreadsheet valid, jadikan sumber acuan
        const studentMap = new Map<string, StudentProfile>();
        existing.forEach((s) => studentMap.set(s.nisn, s));
        sanitized.forEach((s) => studentMap.set(s.nisn, s));

        const merged = Array.from(studentMap.values());
        setStored(KEYS.STUDENTS, merged);

        // Buat akun otomatis untuk siswa baru secara batch efisien
        this.syncStudentAccountsBatch(sanitized);

        window.dispatchEvent(new CustomEvent('ktct_storage_change', { detail: { key: KEYS.STUDENTS } }));
        return {
          success: true,
          count: sheetStudents.length,
          message: `Berhasil menyinkronkan ${sheetStudents.length} siswa langsung dari Google Spreadsheet!`,
        };
      }
      return {
        success: false,
        count: 0,
        message: 'Tidak ada data siswa yang terbaca dari Google Spreadsheet tab SISWA.',
      };
    } catch (err: any) {
      console.warn('Gagal sinkronisasi Google Spreadsheet:', err);
      return {
        success: false,
        count: 0,
        message: `Gagal sinkronisasi Google Spreadsheet: ${err?.message || String(err)}`,
      };
    }
  },

  /**
   * Tarik & sinkronkan butir soal langsung dari Google Spreadsheet tab BANK_SOAL
   */
  async syncBankSoalFromSpreadsheet(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const sheetQuestions = await SpreadsheetService.fetchBankSoal();
      if (sheetQuestions && sheetQuestions.length > 0) {
        const existing = this.getQuestions();
        const qMap = new Map<string, QuestionItem>();
        existing.forEach((q) => qMap.set(q.idSoal, q));
        sheetQuestions.forEach((q) => qMap.set(q.idSoal, q));

        const merged = Array.from(qMap.values());
        setStored(KEYS.QUESTIONS, merged);
        window.dispatchEvent(new CustomEvent('ktct_storage_change', { detail: { key: KEYS.QUESTIONS } }));
        return {
          success: true,
          count: sheetQuestions.length,
          message: `Berhasil menarik ${sheetQuestions.length} butir soal dari sheet BANK_SOAL!`,
        };
      }
      return {
        success: false,
        count: 0,
        message: 'Sheet BANK_SOAL masih kosong atau belum diformat.',
      };
    } catch (err: any) {
      console.warn('Gagal sinkronisasi BANK_SOAL:', err);
      return {
        success: false,
        count: 0,
        message: `Gagal sinkronisasi Bank Soal: ${err?.message || String(err)}`,
      };
    }
  },


  async syncFromCloud() {
    return this.syncFromSpreadsheet();
  },

  // Reset to initial demo dataset
  resetToDefault() {
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.STUDENTS);
    localStorage.removeItem(KEYS.SCHEDULES);
    localStorage.removeItem(KEYS.QUESTIONS);
    localStorage.removeItem(KEYS.SUBMISSIONS);
    localStorage.removeItem(KEYS.VIOLATIONS);
    localStorage.removeItem(KEYS.NOTIFICATIONS);
    localStorage.removeItem(KEYS.PASSWORDS);
    localStorage.removeItem(KEYS.SESSION);
    this.init();
    window.dispatchEvent(new CustomEvent('ktct_storage_change', { detail: { key: 'ALL' } }));
  },

  // Auth & Session
  getSession(): UserAccount | null {
    return getStored<UserAccount | null>(KEYS.SESSION, null);
  },

  setSession(user: UserAccount | null) {
    if (!user) {
      localStorage.removeItem(KEYS.SESSION);
    } else {
      setStored(KEYS.SESSION, user);
    }
  },

  getUsers(): UserAccount[] {
    return getStored<UserAccount[]>(KEYS.USERS, INITIAL_USERS);
  },

  saveUser(user: UserAccount) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.idUser === user.idUser);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    setStored(KEYS.USERS, users);
  },

  getPasswords(): Record<string, string> {
    return getStored<Record<string, string>>(KEYS.PASSWORDS, DEFAULT_PASSWORDS);
  },

  setPassword(username: string, pass: string) {
    const p = this.getPasswords();
    p[username] = pass;
    setStored(KEYS.PASSWORDS, p);
  },

  // Students
  getStudents(): StudentProfile[] {
    const list = getStored<StudentProfile[]>(KEYS.STUDENTS, INITIAL_STUDENTS);
    return list.map((s) => sanitizeStudent(s));
  },

  getStudentByNisn(nisn: string): StudentProfile | undefined {
    return this.getStudents().find((s) => s.nisn === nisn);
  },

  saveStudent(student: StudentProfile, syncUserAccount = true) {
    const cleanStd = sanitizeStudent(student);
    const students = this.getStudents();
    const idx = students.findIndex((s) => s.nisn === cleanStd.nisn);
    if (idx >= 0) {
      students[idx] = cleanStd;
    } else {
      students.push(cleanStd);
    }
    setStored(KEYS.STUDENTS, students);

    // Sync ke Google Spreadsheet melalui Google Apps Script Web App
    SpreadsheetService.saveStudent(cleanStd).catch((e) => console.warn('Spreadsheet sync error:', e));

    if (syncUserAccount) {
      this.syncStudentAccount(cleanStd);
    }
  },

  deleteStudent(nisn: string) {
    const students = this.getStudents().filter((s) => s.nisn !== nisn);
    setStored(KEYS.STUDENTS, students);

    // Also remove from user accounts if student
    const users = this.getUsers().filter((u) => u.username !== nisn);
    setStored(KEYS.USERS, users);
  },

  saveStudentsBatch(newStudents: StudentProfile[], syncUserAccount = true) {
    const sanitizedBatch = (newStudents || []).map((s) => sanitizeStudent(s));
    const students = this.getStudents();
    sanitizedBatch.forEach((newStd) => {
      const idx = students.findIndex((s) => s.nisn === newStd.nisn);
      if (idx >= 0) {
        students[idx] = newStd;
      } else {
        students.push(newStd);
      }
      // Sync setiap siswa ke Google Spreadsheet
      SpreadsheetService.saveStudent(newStd).catch(() => {});
    });
    setStored(KEYS.STUDENTS, students);
    if (syncUserAccount && sanitizedBatch.length > 0) {
      this.syncStudentAccountsBatch(sanitizedBatch);
    }
  },

  saveUsersBatch(newUsers: UserAccount[]) {
    if (!newUsers || newUsers.length === 0) return;
    const current = this.getUsers();
    newUsers.forEach((user) => {
      const idx = current.findIndex((u) => u.idUser === user.idUser || u.username === user.username);
      if (idx >= 0) {
        current[idx] = user;
      } else {
        current.push(user);
      }
    });
    setStored(KEYS.USERS, current);
  },

  setPasswordsBatch(newPasswords: Record<string, string>) {
    if (!newPasswords || Object.keys(newPasswords).length === 0) return;
    const p = this.getPasswords();
    Object.assign(p, newPasswords);
    setStored(KEYS.PASSWORDS, p);
  },

  syncStudentAccountsBatch(students: StudentProfile[]) {
    if (!students || students.length === 0) return;
    const users = this.getUsers();
    const passObj = this.getPasswords();

    for (const student of students) {
      const rawName = (student.nama || 'siswa').trim();
      const firstName = rawName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const pdkt = (student.noPdkt || (student as any).nopdkt || (student as any).NoPDKT || (student as any).nis || '').toString().trim().replace(/^pdkt-?/i, '');
      const defaultPass = `${firstName}${pdkt || (student.nisn ? student.nisn.slice(-3) : '123')}`;
      const username = student.nisn || pdkt;
      if (!username) continue;

      const existingIdx = users.findIndex((u) => u.username === username || (pdkt && u.nopdkt === pdkt));
      if (existingIdx === -1) {
        users.push({
          idUser: 'U-' + (student.id || username),
          username: username,
          nama: student.nama,
          role: 'SISWA',
          status: student.status === 'AKTIF' ? 'AKTIF' : 'TIDAK AKTIF',
          kelas: student.kelas,
          jenjang: student.jenjang,
          linkFoto: student.linkFoto,
          nopdkt: pdkt,
          twoFactorEnabled: false,
        });
      } else {
        users[existingIdx].nama = student.nama;
        users[existingIdx].kelas = student.kelas;
        users[existingIdx].jenjang = student.jenjang;
        users[existingIdx].linkFoto = student.linkFoto;
        users[existingIdx].nopdkt = pdkt;
        users[existingIdx].status = student.status === 'AKTIF' ? 'AKTIF' : 'TIDAK AKTIF';
      }

      if (student.nisn) passObj[student.nisn] = defaultPass;
      if (pdkt) passObj[pdkt] = defaultPass;
    }

    setStored(KEYS.USERS, users);
    setStored(KEYS.PASSWORDS, passObj);
  },

  syncStudentAccount(student: StudentProfile) {
    this.syncStudentAccountsBatch([student]);
  },

  generateAllStudentAccounts(studentsList?: any[]): { count: number; parentCount: number; samplePasswords: { nama: string; username: string; nopdkt: string; pass: string }[] } {
    const list = studentsList && studentsList.length > 0 ? studentsList : this.getStudents();
    const users = this.getUsers();
    const passObj = this.getPasswords();
    let generatedCount = 0;
    let parentCount = 0;
    const samples: { nama: string; username: string; nopdkt: string; pass: string }[] = [];

    for (const student of list) {
      const rawName = (student.nama || student.name || student.NamaLengkap || 'Siswa').trim();
      const firstName = rawName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const pdkt = (student.noPdkt || student.nopdkt || student.NoPDKT || student.nis || student.NIS || student.id || '').toString().trim().replace(/^pdkt-?/i, '');
      const studentPass = `${firstName}${pdkt || (student.nisn ? student.nisn.slice(-3) : '123')}`;
      const username = (student.nisn || pdkt || student.id || '').toString().trim();
      if (!username) continue;

      // 1. Siswa Account
      const usernameLower = username.toLowerCase();
      const userIdx = users.findIndex((u) => {
        if (!u) return false;
        const uUserLower = u.username ? String(u.username).trim().toLowerCase() : '';
        return (
          (uUserLower && uUserLower === usernameLower) || 
          (pdkt && u.nopdkt === pdkt && u.role === 'SISWA') || 
          (u.idUser && u.idUser === `U-${student.id || username}`)
        );
      });

      if (userIdx === -1) {
        users.push({
          idUser: 'U-' + (student.id || username),
          username: username,
          nama: rawName,
          role: 'SISWA',
          status: 'AKTIF',
          kelas: student.kelas || student.class,
          nopdkt: pdkt,
          twoFactorEnabled: false
        });
      } else {
        users[userIdx].nama = rawName;
        users[userIdx].nopdkt = pdkt;
        users[userIdx].status = 'AKTIF';
      }

      // 2. Orang Tua Account
      const parentUsername = `ortu_${username}`;
      const parentUsernameLower = parentUsername.toLowerCase();
      const parentName = (student.NamaAyah || student.namaAyah || student.NamaIbu || student.namaIbu || student.NamaWali || student.namaWali || student.parentName || `Orang Tua dari ${rawName}`).trim();
      const parentIdx = users.findIndex((u) => {
        if (!u) return false;
        const uUserLower = u.username ? String(u.username).trim().toLowerCase() : '';
        return (
          (uUserLower && uUserLower === parentUsernameLower) ||
          (u.idUser && u.idUser === `U-ORTU-${student.id || username}`)
        );
      });

      if (parentIdx === -1) {
        users.push({
          idUser: `U-ORTU-${student.id || username}`,
          username: parentUsername,
          nama: parentName,
          role: 'ORANG_TUA',
          status: 'AKTIF',
          kelas: student.kelas || student.class,
          nopdkt: pdkt,
          twoFactorEnabled: false
        });
        parentCount++;
      } else {
        users[parentIdx].nama = parentName;
        users[parentIdx].nopdkt = pdkt;
        users[parentIdx].status = 'AKTIF';
        parentCount++;
      }

      if (student.nisn) {
        passObj[student.nisn] = studentPass;
        passObj[`ortu_${student.nisn}`] = studentPass;
      }
      if (pdkt) {
        passObj[pdkt] = studentPass;
        passObj[`ortu_${pdkt}`] = studentPass;
      }
      passObj[parentUsername] = studentPass;
      generatedCount++;

      if (samples.length < 5) {
        samples.push({
          nama: rawName,
          username: username,
          nopdkt: pdkt,
          pass: studentPass
        });
      }
    }

    setStored(KEYS.USERS, users);
    setStored(KEYS.PASSWORDS, passObj);
    return { count: generatedCount, parentCount, samplePasswords: samples };
  },

  // Schedules
  getSchedules(): ExamSchedule[] {
    const list = getStored<ExamSchedule[]>(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    return list.map((s) => ({
      ...s,
      jenjang: normalizeJenjang(s.jenjang, s.kelas),
    }));
  },

  saveSchedule(schedule: ExamSchedule) {
    schedule.jenjang = normalizeJenjang(schedule.jenjang, schedule.kelas);
    const schedules = this.getSchedules();
    const idx = schedules.findIndex((s) => s.idJadwal === schedule.idJadwal);
    if (idx >= 0) {
      schedules[idx] = schedule;
    } else {
      schedules.push(schedule);
    }
    setStored(KEYS.SCHEDULES, schedules);
  },

  updateSchedulesBatch(ids: string[], status: 'AKTIF' | 'NONAKTIF' | 'Terjadwal') {
    const schedules = this.getSchedules();
    schedules.forEach((s) => {
      if (ids.includes(s.idJadwal)) {
        s.status = status;
      }
    });
    setStored(KEYS.SCHEDULES, schedules);
  },

  resetSchedulesToSTS(): ExamSchedule[] {
    setStored(KEYS.SCHEDULES, INITIAL_SCHEDULES);
    return INITIAL_SCHEDULES;
  },

  deleteSchedule(idJadwal: string) {
    const schedules = this.getSchedules().filter((s) => s.idJadwal !== idJadwal);
    setStored(KEYS.SCHEDULES, schedules);
  },

  // Questions
  getQuestions(): QuestionItem[] {
    return getStored<QuestionItem[]>(KEYS.QUESTIONS, INITIAL_QUESTIONS);
  },

  getQuestionsByExam(idUjian: string): QuestionItem[] {
    return this.getQuestions().filter((q) => q.idUjian === idUjian && q.status === 'AKTIF');
  },

  saveQuestion(question: QuestionItem) {
    const list = this.getQuestions();
    const idx = list.findIndex((q) => q.idSoal === question.idSoal);
    if (idx >= 0) {
      list[idx] = question;
    } else {
      list.push(question);
    }
    setStored(KEYS.QUESTIONS, list);
  },

  deleteQuestion(idSoal: string) {
    const list = this.getQuestions().filter((q) => q.idSoal !== idSoal);
    setStored(KEYS.QUESTIONS, list);
  },

  // Submissions & Results
  getSubmissions(): ExamSubmission[] {
    return getStored<ExamSubmission[]>(KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
  },

  getSubmissionsByNisn(nisn: string): ExamSubmission[] {
    return this.getSubmissions().filter((s) => s.nisn === nisn);
  },

  saveSubmission(submission: ExamSubmission) {
    const list = this.getSubmissions();
    const idx = list.findIndex((s) => s.idHasil === submission.idHasil);
    if (idx >= 0) {
      list[idx] = submission;
    } else {
      list.unshift(submission);
    }
    setStored(KEYS.SUBMISSIONS, list);

    // Auto add notification to parent and student
    this.addNotification({
      id: 'NOTIF-' + Date.now(),
      judul: `Nilai Terbit: ${submission.mapel}`,
      pesan: `${submission.namaSiswa} telah menyelesaikan ujian dengan Nilai Akhir: ${submission.nilaiAkhir} (${submission.status}).`,
      tipe: 'NILAI',
      waktu: 'Baru saja',
      dibaca: false,
      targetRole: 'ALL',
      targetKelas: submission.kelas,
    });
  },

  // Violations
  getViolations(): ViolationRecord[] {
    return getStored<ViolationRecord[]>(KEYS.VIOLATIONS, INITIAL_VIOLATIONS);
  },

  recordViolation(violation: Omit<ViolationRecord, 'idPelanggaran' | 'waktu'>) {
    const list = this.getViolations();
    const now = new Date();
    const record: ViolationRecord = {
      ...violation,
      idPelanggaran: 'PLG-' + Date.now(),
      waktu: now.toISOString().replace('T', ' ').substring(0, 19),
    };
    list.unshift(record);
    setStored(KEYS.VIOLATIONS, list);
    return record;
  },

  // Notifications
  getNotifications(): NotificationItem[] {
    return getStored<NotificationItem[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },

  addNotification(notif: NotificationItem) {
    const list = this.getNotifications();
    list.unshift(notif);
    setStored(KEYS.NOTIFICATIONS, list);
  },

  markNotificationsAsRead() {
    const list = this.getNotifications().map((n) => ({ ...n, dibaca: true }));
    setStored(KEYS.NOTIFICATIONS, list);
  },

  // Calculate grading and anti-cheating deduction logic
  evaluateExamResult(params: {
    totalBobot: number;
    skorDiperoleh: number;
    pelanggaran: number;
    maxPelanggaran?: number;
  }) {
    const { totalBobot, skorDiperoleh, pelanggaran } = params;
    const maxPelanggaran = params.maxPelanggaran || 3;

    const nilaiMentah = totalBobot > 0 ? Math.round((skorDiperoleh / totalBobot) * 100) : 0;

    let nilaiAkhir = nilaiMentah;
    let status: ExamSubmission['status'] = '✅ LULUS';

    if (pelanggaran >= maxPelanggaran) {
      nilaiAkhir = Math.max(nilaiMentah - pelanggaran * 5, 0);
      status = '🚫 REMEDIAL';
    } else if (pelanggaran === 0) {
      if (nilaiMentah >= 65) {
        status = '✅ LULUS';
        nilaiAkhir = nilaiMentah;
      } else {
        // Bonus kedisiplinan kejujuran: tuntas bersyarat
        status = '⭐ TUNTAS';
        nilaiAkhir = Math.max(nilaiMentah, 65);
      }
    } else {
      nilaiAkhir = Math.max(nilaiMentah - pelanggaran * 5, 0);
      if (nilaiAkhir >= 65) {
        status = '⚠️ SELESAI';
      } else {
        status = '❌ TIDAK TUNTAS';
      }
    }

    return {
      nilaiMentah,
      nilaiAkhir,
      status,
      pelanggaran,
    };
  },

  // Generate deep individual statistical analysis
  getIndividualAnalysis(nisn: string): IndividualStatAnalysis {
    const student = this.getStudentByNisn(nisn);
    const submissions = this.getSubmissionsByNisn(nisn);
    const violations = this.getViolations().filter((v) => v.nisn === nisn);

    const totalUjian = submissions.length;
    const rataNilai =
      totalUjian > 0
        ? Math.round(submissions.reduce((acc, curr) => acc + curr.nilaiAkhir, 0) / totalUjian)
        : 0;
    const rataMentah =
      totalUjian > 0
        ? Math.round(submissions.reduce((acc, curr) => acc + curr.nilaiMentah, 0) / totalUjian)
        : 0;

    const totalPelanggaran = violations.length;
    const integritasScore = Math.max(0, 100 - totalPelanggaran * 15);

    const mapelBreakdown = submissions.map((sub) => {
      let kat = 'Cukup';
      if (sub.nilaiAkhir >= 85) kat = 'Sangat Baik';
      else if (sub.nilaiAkhir >= 75) kat = 'Baik';
      else if (sub.nilaiAkhir >= 65) kat = 'Cukup';
      else kat = 'Perlu Pendampingan';

      return {
        mapel: sub.mapel,
        nilai: sub.nilaiAkhir,
        kategori: kat,
        benchmarkKelas: 73, // Average class baseline
      };
    });

    const riwayatPerkembangan = submissions.map((sub, idx) => ({
      label: `Sesi ${idx + 1}: ${sub.mapel.substring(0, 8)}`,
      nilai: sub.nilaiAkhir,
      pelanggaran: sub.pelanggaran,
    }));

    const kekuatan: string[] = [];
    const areaPerbaikan: string[] = [];
    const rekomendasi: string[] = [];

    submissions.forEach((s) => {
      if (s.nilaiAkhir >= 80) {
        kekuatan.push(`Penguasaan materi ${s.mapel} sangat memuaskan (${s.nilaiAkhir})`);
      } else if (s.nilaiAkhir < 65) {
        areaPerbaikan.push(`Perlu remedial & tutor sebaya untuk mata pelajaran ${s.mapel}`);
      }
    });

    if (totalPelanggaran === 0) {
      kekuatan.push('Disiplin dan integritas ujian sangat tinggi (0 pelanggaran)');
      rekomendasi.push('Pertahankan fokus belajar mandiri dan motivasi berprestasi.');
    } else {
      areaPerbaikan.push(`Tercatat ${totalPelanggaran}x pelanggaran teknis (pindah tab browser)`);
      rekomendasi.push('Hindari membuka aplikasi atau tab lain saat ujian sedang berlangsung.');
    }

    if (kekuatan.length === 0) {
      kekuatan.push('Kehadiran tepat waktu dan semangat belajar aktif di Rombel KTCT');
    }

    if (areaPerbaikan.length === 0) {
      areaPerbaikan.push('Tingkatkan latihan soal tingkat lanjut (HOTS) untuk persiapan seleksi jenjang berikutnya');
    }

    return {
      nisn,
      nama: student?.nama || 'Siswa Rombel KTCT',
      kelas: student?.kelas || '9',
      totalUjianDiikuti: totalUjian,
      rataRataNilai: rataNilai,
      rataRataMentah: rataMentah,
      totalPelanggaran,
      integritasScore,
      statusKelulusan: rataNilai >= 65 ? 'MEMENUHI KRITERIA' : 'PERLU EVALUASI',
      kekuatan,
      areaPerbaikan,
      rekomendasi,
      mapelBreakdown,
      riwayatPerkembangan,
    };
  },
};
