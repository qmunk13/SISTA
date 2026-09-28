import { DEFAULT_APP_CONFIG } from '../data/config';
import { db } from '../data/db';
import { cleanStudentClass } from '../store';
import { StorageService } from './storageService';
import { parseCSV } from '../utils/googleSheetSync';
import { UserRoleItem, ALL_32_ROLES } from '../data/rolesData';
import { getGoogleDriveDirectImageUrl } from '../lib/utils';
import { INITIAL_SAMPLE_DATA } from '../data/schemas';

export interface SheetUserItem {
  id: string;
  userId: string;
  username: string;
  password?: string;
  roleId: string;
  role: string;
  nama: string;
  name: string;
  nipNisn: string;
  email: string;
  noHp: string;
  status: string;
  lastLogin?: string;
  raw?: any;
}

let inMemoryUsersCache: SheetUserItem[] = [];
let isFetchingUsers = false;
let lastFetchTime = 0;

export const AuthService = {
  /**
   * Mengambil data USERS dari memori, db, atau storage
   */
  getLoadedUsers(): SheetUserItem[] {
    if (inMemoryUsersCache.length > 0) {
      return inMemoryUsersCache;
    }

    try {
      const fromDb = db.get<any>('users') || [];
      if (Array.isArray(fromDb) && fromDb.length > 0) {
        inMemoryUsersCache = fromDb.map(this.normalizeUserRow);
        return inMemoryUsersCache;
      }
    } catch {}

    try {
      const fromStorage = StorageService.getUsers() || [];
      if (Array.isArray(fromStorage) && fromStorage.length > 0) {
        inMemoryUsersCache = fromStorage.map(this.normalizeUserRow);
        return inMemoryUsersCache;
      }
    } catch {}

    try {
      if (INITIAL_SAMPLE_DATA?.USERS && Array.isArray(INITIAL_SAMPLE_DATA.USERS) && INITIAL_SAMPLE_DATA.USERS.length > 0) {
        inMemoryUsersCache = INITIAL_SAMPLE_DATA.USERS.map(this.normalizeUserRow);
        return inMemoryUsersCache;
      }
    } catch {}

    return [];
  },

  /**
   * Normalisasi satu baris data user
   */
  normalizeUserRow(r: any): SheetUserItem {
    const rawId = r.UserID || r.id || r.userId || r.idUser || '';
    const rawUser = r.Username || r.username || '';
    const rawPass = r.Password || r.password || '';
    const rawRole = r.RoleID || r.roleId || r.Role || r.role || 'SISWA';
    const rawNama = r.Nama || r.nama || r.Name || r.name || rawUser;
    const rawNipNisn = r.NIP_NISN || r.nip_nisn || r.nipNisn || r.NISN || r.nisn || r.NIP || r.nip || '';
    const rawEmail = r.Email || r.email || '';
    const rawNoHp = r.NoHP || r.nohp || r.noHp || r.NoTelepon || '';
    const rawStatus = r.Status || r.status || 'Aktif';

    // Standarisasi role
    let stdRole = String(rawRole).trim().toUpperCase();
    if (stdRole === 'RL-026' || stdRole === 'STUDENT') stdRole = 'SISWA';
    if (stdRole === 'RL-019' || stdRole === 'TEACHER') stdRole = 'GURU';
    if (stdRole === 'RL-027' || stdRole === 'PARENT') stdRole = 'ORANG_TUA';

    return {
      id: rawId || `USR_${rawUser}`,
      userId: rawId,
      username: String(rawUser).trim(),
      password: String(rawPass).trim(),
      roleId: String(rawRole).trim(),
      role: stdRole,
      nama: String(rawNama).trim(),
      name: String(rawNama).trim(),
      nipNisn: String(rawNipNisn).trim(),
      email: String(rawEmail).trim(),
      noHp: String(rawNoHp).trim(),
      status: String(rawStatus).trim(),
      raw: r
    };
  },

  /**
   * Tarik langsung sheet USERS dari Google Spreadsheet secara realtime
   */
  async fetchUsersFromSpreadsheet(spreadsheetId?: string, force: boolean = false): Promise<SheetUserItem[]> {
    const targetSsId = spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
    if (!targetSsId) return this.getLoadedUsers();

    // Cache throttle (hindari spam fetch berulang dalam 15 detik jika tidak dipaksa)
    const now = Date.now();
    if (!force && inMemoryUsersCache.length > 50 && now - lastFetchTime < 15000) {
      return inMemoryUsersCache;
    }

    if (isFetchingUsers) {
      return this.getLoadedUsers();
    }

    isFetchingUsers = true;
    try {
      let rawRows: any[] = [];
      const apiOrigin = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

      // 1. Coba lewat fast server-side endpoint terlebih dahulu
      try {
        const localResp = await fetch(`${apiOrigin}/api/sheet-data/USERS?spreadsheetId=${targetSsId}`);
        if (localResp.ok) {
          const lJson = await localResp.json();
          if (lJson?.success && Array.isArray(lJson.data) && lJson.data.length > 0) {
            rawRows = lJson.data;
          }
        }
      } catch {}

      // 2. Jika belum berhasil, tarik langsung dari Google Spreadsheet GViz CSV
      if (rawRows.length === 0) {
        const url = `https://docs.google.com/spreadsheets/d/${targetSsId}/gviz/tq?tqx=out:csv&sheet=USERS&t=${now}`;
        const res = await fetch(url);
        if (res.ok) {
          const csvText = await res.text();
          rawRows = parseCSV(csvText);
        }
      }

      if (Array.isArray(rawRows) && rawRows.length > 0) {
        const normalizedList: SheetUserItem[] = rawRows.map((r) => this.normalizeUserRow(r));

        // Pastikan akun Administrator Utama selalu tersedia
        const hasAdmin = normalizedList.some(u => {
          const uName = (u.username || '').toLowerCase();
          return uName === 'admin' || uName === 'superadmin';
        });
        if (!hasAdmin) {
          normalizedList.unshift({
            id: 'USR_ADMIN_001',
            userId: 'USR_001',
            username: 'admin',
            password: 'admin',
            roleId: 'RL-001',
            role: 'SUPERADMIN',
            nama: 'Administrator Sistem',
            name: 'Administrator Sistem',
            nipNisn: '-',
            email: 'admin.pkbmtambora@gmail.com',
            noHp: '081234567890',
            status: 'Aktif'
          });
        }

        inMemoryUsersCache = normalizedList;
        lastFetchTime = now;

        // Simpan ke DB lokal & StorageService agar offline tetap berfungsi
        try {
          db.set('users', normalizedList);
        } catch {}

        try {
          // Simpan password map ke StorageService
          const passMap: Record<string, string> = {};
          const storageUserList: any[] = [];
          normalizedList.forEach((u) => {
            if (u.username && u.password) {
              passMap[u.username.toLowerCase()] = u.password;
              if (u.nipNisn) passMap[u.nipNisn.toLowerCase()] = u.password;
            }
            storageUserList.push({
              id: u.id,
              username: u.username,
              nama: u.nama,
              name: u.nama,
              role: u.role,
              email: u.email,
              status: u.status,
              nopdkt: u.nipNisn
            });
          });

          StorageService.saveUsersBatch(storageUserList);
          StorageService.setPasswordsBatch(passMap);
        } catch {}

        return normalizedList;
      }
    } catch (err) {
      console.warn('[AuthService] Gagal fetch USERS dari spreadsheet:', err);
    } finally {
      isFetchingUsers = false;
    }

    return this.getLoadedUsers();
  },

  /**
   * Deteksi akun saat pengguna mengetik identifier
   */
  findUserByIdentifier(identifier: string, extraStudents: any[] = [], extraTeachers: any[] = []): SheetUserItem | null {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return null;

    const loaded = this.getLoadedUsers();

    // 0. Shortcut Dewan Guru / Guru Umum
    if (clean === 'dewanguru' || clean === 'guru') {
      const firstT = (extraTeachers && extraTeachers.length > 0) ? extraTeachers[0] : null;
      return {
        id: 'USR_DEWANGURU',
        userId: 'USR_DEWANGURU',
        username: 'dewanguru',
        password: 'admin123',
        roleId: 'RL-019',
        role: 'GURU',
        nama: firstT?.name || firstT?.nama || 'Dewan Guru Rombel KTCT',
        name: firstT?.name || firstT?.nama || 'Dewan Guru Rombel KTCT',
        nipNisn: firstT?.nip || firstT?.nik || 'dewanguru',
        email: firstT?.email || 'dewanguru@rombel.sch.id',
        noHp: firstT?.phone || '',
        status: 'Aktif',
        raw: firstT
      };
    }

    // 1. Cocokkan langsung dari USERS sheet
    const cleanDigits = clean.replace(/[^0-9]/g, '');
    const directMatch = loaded.find((u) => {
      if (!u) return false;
      const uName = (u.username || '').toLowerCase();
      const uNipNisn = (u.nipNisn || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uNama = (u.nama || '').toLowerCase();
      const uId = (u.id || '').toLowerCase();

      if (
        (uName && uName === clean) ||
        (uNipNisn && uNipNisn === clean) ||
        (uEmail && uEmail === clean) ||
        (uId && uId === clean) ||
        (uNama && uNama === clean)
      ) return true;

      // Handle variasi leading zeros pada Username atau NISN/PDKT (hanya jika minimal 6 digit untuk mencegah false match)
      if (cleanDigits && cleanDigits.length >= 6) {
        const uNameDigits = uName.replace(/\D/g, '');
        const uNipDigits = uNipNisn.replace(/\D/g, '');
        if (uNameDigits && uNameDigits.length >= 6 && (uNameDigits === cleanDigits || uNameDigits.replace(/^0+/, '') === cleanDigits.replace(/^0+/, ''))) return true;
        if (uNipDigits && uNipDigits.length >= 6 && (uNipDigits === cleanDigits || uNipDigits.replace(/^0+/, '') === cleanDigits.replace(/^0+/, ''))) return true;
      }

      return false;
    });

    if (directMatch) return directMatch;

    // 2. Cocokkan untuk nomor HP orang tua / siswa
    const cleanNumbers = clean.replace(/[^0-9]/g, '');
    if (cleanNumbers.length >= 7) {
      const hpMatch = loaded.find((u) => {
        if (!u) return false;
        const uHp = (u.noHp || '').replace(/[^0-9]/g, '');
        return uHp && (uHp === cleanNumbers || uHp.endsWith(cleanNumbers));
      });
      if (hpMatch) return hpMatch;
    }

    // 3. Cocokkan dari data Siswa master
    const allStudentsPool = [
      ...extraStudents,
      ...((db.get('students') as any[]) || []),
      ...((db.get('SISWA') as any[]) || []),
      ...((db.get('siswa') as any[]) || [])
    ];

    if (allStudentsPool.length > 0) {
      const sMatch = allStudentsPool.find((s) => {
        if (!s) return false;
        const sNisn = String(s.nisn || s.NISN || '').trim().toLowerCase();
        const sNopdkt = String(s.nopdkt || s.noPdkt || s.NoPdkt || s.nis || s.NIS || '').trim().toLowerCase();
        const sNama = String(s.nama || s.name || s.NamaLengkap || s.Nama || '').trim().toLowerCase();
        const sNik = String(s.nik || s.NIK || '').trim().toLowerCase();
        const sId = String(s.id || '').trim().toLowerCase();

        if (sNisn && (sNisn === clean || (cleanDigits.length >= 6 && sNisn.replace(/\D/g, '') === cleanDigits))) return true;
        if (sNopdkt && (sNopdkt === clean || sNopdkt.replace(/^0+/, '') === clean.replace(/^0+/, ''))) return true;
        if (sNik && sNik === clean) return true;
        if (sId && sId === clean) return true;
        if (sNama && (sNama === clean || (clean.length >= 4 && sNama.includes(clean)))) return true;
        return false;
      });

      if (sMatch) {
        const pdktVal = String(sMatch.nopdkt || sMatch.noPdkt || sMatch.NoPdkt || sMatch.nis || sMatch.NIS || sMatch.id || '').trim();
        const nisnVal = String(sMatch.nisn || sMatch.NISN || pdktVal).trim();
        const fullName = String(sMatch.nama || sMatch.name || sMatch.NamaLengkap || sMatch.Nama || 'Siswa').trim();
        
        // Ambil kelas riil siswa
        const rawClass = String(sMatch.class || sMatch.KelasSaatini || sMatch.KelasSaatIni || sMatch.Kelas || sMatch.kelas || sMatch.rombel || '').trim();
        const normClass = rawClass.replace(/\bKELAS\b/gi, '').replace(/[-_]/g, '').replace(/\s+/g, '').trim();

        const rawFoto = sMatch.fotoUrl || sMatch.PasFoto || sMatch.pasFoto || sMatch.Foto || '';
        const fotoDirect = rawFoto ? getGoogleDriveDirectImageUrl(rawFoto) : '';

        return {
          id: `USR_${sMatch.id || pdktVal || nisnVal}`,
          userId: sMatch.id || pdktVal || nisnVal,
          username: nisnVal || pdktVal,
          password: '',
          roleId: 'RL-026',
          role: 'SISWA',
          nama: fullName,
          name: fullName,
          nipNisn: pdktVal || nisnVal,
          email: sMatch.email || `${(nisnVal || pdktVal).toLowerCase()}@siswa.sch.id`,
          noHp: sMatch.noHp || sMatch.NomorHP || '',
          status: sMatch.status || sMatch.Status || 'Aktif',
          raw: {
            ...sMatch,
            class: normClass,
            KelasSaatini: normClass,
            fotoUrl: fotoDirect,
            pasFoto: fotoDirect
          }
        };
      }
    }

    // 4. Cocokkan dari data Guru jika ada
    if (extraTeachers && extraTeachers.length > 0) {
      const tMatch = extraTeachers.find((t) => {
        const tNip = String(t.nip || '').toLowerCase();
        const tNik = String(t.nik || '').toLowerCase();
        const tNama = String(t.name || t.nama || '').toLowerCase();
        return tNip === clean || tNik === clean || tNama.includes(clean);
      });

      if (tMatch) {
        return {
          id: `USR_GR_${tMatch.id || tMatch.nip}`,
          userId: tMatch.id || tMatch.nip,
          username: tMatch.nip || tMatch.nik || 'guru',
          password: 'admin123',
          roleId: 'RL-019',
          role: 'GURU',
          nama: tMatch.name || tMatch.nama || 'Dewan Guru',
          name: tMatch.name || tMatch.nama || 'Dewan Guru',
          nipNisn: tMatch.nip || tMatch.nik || '',
          email: tMatch.email || '',
          noHp: tMatch.phone || '',
          status: 'Aktif',
          raw: tMatch
        };
      }
    }

    return null;
  },

  /**
   * Eksekusi verifikasi autentikasi lengkap
   */
  async authenticate(
    identifier: string,
    passInput: string,
    settings: any,
    extraStudents: any[] = [],
    extraTeachers: any[] = []
  ): Promise<{
    success: boolean;
    user?: SheetUserItem;
    roleId: string;
    studentId?: string;
    message?: string;
  }> {
    const cleanUser = identifier.trim();
    const cleanPass = passInput.trim();
    const query = cleanUser.toLowerCase();

    // Pastikan username dan password wajib diisi
    if (!cleanUser || !cleanPass) {
      return {
        success: false,
        roleId: '',
        message: 'Identitas pengguna dan kata sandi wajib diisi!'
      };
    }

    // 1. Cek Superadmin Khusus (Mendukung password resmi admin, admin123, 123456, atau dari konfigurasi settings)
    const adminUser = (settings?.adminUsername || 'admin').trim().toLowerCase();
    const adminPass = (settings?.adminPassword || 'admin').trim();
    const isMasterAdmin =
      query === adminUser ||
      query === 'superadmin' ||
      query === 'admin' ||
      query === 'root' ||
      query === 'administrator';

    if (isMasterAdmin) {
      const validAdminPasswords = new Set<string>();
      if (adminPass) {
        validAdminPasswords.add(adminPass);
        validAdminPasswords.add(adminPass.toLowerCase());
      }
      validAdminPasswords.add('admin');
      validAdminPasswords.add('admin123');
      validAdminPasswords.add('123456');
      validAdminPasswords.add('superadmin');
      validAdminPasswords.add('admin.pkbmtambora');

      // Ambil juga jika ada di database users
      const loadedUsers = this.getLoadedUsers();
      const adminInDb = loadedUsers.find((u) => {
        const uName = (u.username || '').toLowerCase();
        return uName === 'admin' || uName === 'superadmin' || uName === adminUser;
      });
      if (adminInDb?.password) {
        validAdminPasswords.add(adminInDb.password.trim());
        validAdminPasswords.add(adminInDb.password.trim().toLowerCase());
      }

      const isPassValid =
        validAdminPasswords.has(cleanPass) ||
        validAdminPasswords.has(cleanPass.toLowerCase());

      if (isPassValid) {
        return {
          success: true,
          roleId: 'RL-001',
          user: {
            id: adminInDb?.id || 'USR_SUPERADMIN',
            userId: adminInDb?.userId || 'USR_001',
            username: query,
            password: cleanPass,
            roleId: 'RL-001',
            role: 'SUPERADMIN',
            nama: adminInDb?.nama || 'Super Administrator Utama',
            name: adminInDb?.nama || 'Super Administrator Utama',
            nipNisn: adminInDb?.nipNisn || '-',
            email: adminInDb?.email || 'admin.pkbmtambora@gmail.com',
            noHp: adminInDb?.noHp || '085141809991',
            status: 'Aktif'
          }
        };
      } else {
        return {
          success: false,
          roleId: '',
          message: 'Kata sandi tidak sesuai! Gunakan kata sandi admin (default: "admin" atau "admin123").'
        };
      }
    }

    // 1b. Cek Shortcut Khusus Dewan Guru
    if (query === 'dewanguru' || query === 'guru') {
      const validGuruPasswords = new Set<string>(['admin123', 'guru123', '123456', 'dewanguru', 'guru']);
      if (validGuruPasswords.has(cleanPass) || validGuruPasswords.has(cleanPass.toLowerCase())) {
        const firstT = (extraTeachers && extraTeachers.length > 0) ? extraTeachers[0] : null;
        return {
          success: true,
          roleId: 'RL-019',
          user: {
            id: 'USR_DEWANGURU',
            userId: 'USR_DEWANGURU',
            username: query,
            password: cleanPass,
            roleId: 'RL-019',
            role: 'GURU',
            nama: firstT?.name || firstT?.nama || 'Dewan Guru Rombel KTCT',
            name: firstT?.name || firstT?.nama || 'Dewan Guru Rombel KTCT',
            nipNisn: firstT?.nip || firstT?.nik || 'dewanguru',
            email: firstT?.email || 'dewanguru@rombel.sch.id',
            noHp: firstT?.phone || '',
            status: 'Aktif',
            raw: firstT
          }
        };
      } else {
        return {
          success: false,
          roleId: '',
          message: 'Kata sandi tidak sesuai! Untuk akun guru, gunakan kata sandi "admin123" atau "guru123".'
        };
      }
    }

    // 2. Jika user cache masih sedikit (< 10), coba fetch dari Google Spreadsheet terlebih dahulu
    let usersList = this.getLoadedUsers();
    if (usersList.length < 10) {
      try {
        usersList = await this.fetchUsersFromSpreadsheet(settings?.spreadsheetId, true);
      } catch {}
    }

    // 3. Cari user yang cocok
    const matched = this.findUserByIdentifier(cleanUser, extraStudents, extraTeachers);

    if (!matched) {
      return {
        success: false,
        roleId: '',
        message: 'Identitas pengguna tidak terdaftar. Periksa kembali Username/NISN/NIP Anda.'
      };
    }

    // 4. Periksa status keaktifan user
    const statusUpper = (matched.status || 'AKTIF').toUpperCase();
    if (statusUpper.includes('NON') || statusUpper.includes('TIDAK') || statusUpper === 'KELUAR') {
      return {
        success: false,
        roleId: '',
        message: `Akun "${matched.nama}" berstatus ${matched.status}. Silakan hubungi admin sekolah untuk mengaktifkan akun.`
      };
    }

    // 5. Validasi Kata Sandi (Harus Sesuai dengan Identitas Pengguna)
    const dbPassword = (matched.password || '').trim();
    const passLower = cleanPass.toLowerCase();

    // Hitung dynamic student password (nama depan + nomor PDKT)
    const rawName = (matched.nama || matched.name || 'Siswa').trim();
    const firstName = rawName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPdkt = (matched.nipNisn || '').replace(/^pdkt-?/i, '').replace(/[^0-9]/g, '');
    const dynamicStudentPass = firstName && cleanPdkt ? `${firstName}${cleanPdkt}` : '';

    let isPasswordValid = false;

    if (dbPassword) {
      isPasswordValid = cleanPass === dbPassword || passLower === dbPassword.toLowerCase();
    }
    // Jika akun siswa atau orang tua, izinkan juga kata sandi berupa NISN mereka, formula resmi, atau kata sandi umum
    if (!isPasswordValid && (matched.role === 'SISWA' || matched.role === 'ORANG_TUA')) {
      const cleanDigits = (v: any) => String(v || '').replace(/\D/g, '');
      const passDigits = cleanDigits(cleanPass);
      const rawNisn = (matched.nipNisn && matched.nipNisn !== '-') ? matched.nipNisn : matched.username;
      const userNisnDigits = cleanDigits(rawNisn);
      if (passDigits && userNisnDigits && (passDigits === userNisnDigits || passDigits.replace(/^0+/, '') === userNisnDigits.replace(/^0+/, ''))) {
        isPasswordValid = true;
      } else if (cleanPass === '123456' || cleanPass === 'siswa123' || cleanPass === 'rombel123') {
        isPasswordValid = true;
      } else if (dynamicStudentPass && passLower === dynamicStudentPass) {
        isPasswordValid = true;
      }
    }

    // Jika akun guru, izinkan juga kata sandi standar
    if (!isPasswordValid && (matched.role === 'GURU' || (matched.roleId && matched.roleId === 'RL-019'))) {
      if (cleanPass === 'admin123' || cleanPass === 'guru123' || cleanPass === '123456' || passLower === 'admin123' || passLower === 'guru123') {
        isPasswordValid = true;
      }
    }

    // Jika akun admin / staf manajemen
    if (!isPasswordValid && (matched.role === 'ADMIN' || matched.role === 'SUPERADMIN' || matched.roleId === 'RL-001' || matched.roleId === 'RL-002')) {
      if (cleanPass === 'admin' || cleanPass === 'admin123' || cleanPass === '123456' || passLower === 'admin' || passLower === 'admin123') {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      return {
        success: false,
        roleId: '',
        message: 'Kata sandi tidak sesuai dengan identitas pengguna!'
      };
    }

    // 6. Mapping RoleID ke format standar RBAC Rombel KTCT
    let finalRoleId = 'RL-026'; // Default SISWA
    const rUpper = matched.role.toUpperCase();
    const rIdUpper = (matched.roleId || '').toUpperCase();

    if (rIdUpper.startsWith('RL-')) {
      finalRoleId = rIdUpper;
    } else if (rUpper === 'SISWA' || rUpper === 'STUDENT') {
      finalRoleId = 'RL-026';
    } else if (rUpper === 'GURU' || rUpper === 'TEACHER') {
      finalRoleId = 'RL-019';
    } else if (rUpper === 'ORANG_TUA' || rUpper === 'PARENT' || rUpper === 'WALI') {
      finalRoleId = 'RL-027';
    } else if (rUpper.includes('ADMIN') || rUpper === 'SUPERADMIN') {
      finalRoleId = 'RL-001';
    } else if (rUpper.includes('KEPALA')) {
      finalRoleId = 'RL-009';
    } else if (rUpper.includes('BENDAHARA') || rUpper.includes('KEUANGAN')) {
      finalRoleId = 'RL-017';
    } else if (rUpper.includes('BK') || rUpper.includes('KONSELING')) {
      finalRoleId = 'RL-021';
    } else if (rUpper.includes('PERPUS') || rUpper.includes('PUSTAKA')) {
      finalRoleId = 'RL-023';
    }

    // 7. Tentukan studentId jika akun siswa / orang tua
    let activeStudentId: string | undefined;
    if (finalRoleId === 'RL-026' || finalRoleId === 'RL-027') {
      let allPossibleStudents = [
        ...extraStudents,
        ...((db.get('students') as any[]) || []),
        ...((db.get('SISWA') as any[]) || []),
        ...((db.get('siswa') as any[]) || [])
      ];

      // Jika data siswa lokal masih kosong/sedikit, coba tarik langsung dari endpoint server SISWA
      if (allPossibleStudents.length < 5 && typeof fetch !== 'undefined') {
        try {
          const apiOrigin = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
          const resp = await fetch(`${apiOrigin}/api/sheet-data/SISWA`);
          if (resp.ok) {
            const data = await resp.json();
            if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
              const cleanedSiswa = data.data.map(cleanStudentClass).filter((s: any) => s && (s.name || s.nama));
              if (cleanedSiswa.length > 0) {
                allPossibleStudents = cleanedSiswa;
                try {
                  db.set('students', cleanedSiswa, { skipPush: true });
                  db.set('SISWA', cleanedSiswa, { skipPush: true });
                } catch {}
              }
            }
          }
        } catch {}
      }

      const cleanDigits = (v: any) => String(v || '').replace(/\D/g, '');
      const userNisnDigits = cleanDigits(matched.nipNisn || matched.username);
      const userCleanName = String(matched.nama || matched.name || '').trim().toLowerCase();

      const foundStudent = allPossibleStudents.find(
        (s) => {
          if (!s) return false;
          const sNisnDigits = cleanDigits(s.nisn || s.NISN);
          const sNopdktDigits = cleanDigits(s.nopdkt || s.nis || s.NIS);
          const sName = String(s.name || s.nama || s.NamaLengkap || '').trim().toLowerCase();
          const sId = String(s.id || '').trim();

          // 1. Direct ID match
          if (sId && (sId === matched.id || sId === matched.userId)) return true;

          // 2. Direct string match
          if (s.nisn && (String(s.nisn).trim() === String(matched.nipNisn).trim() || String(s.nisn).trim() === String(matched.username).trim())) return true;
          if (s.nopdkt && (String(s.nopdkt).trim() === String(matched.nipNisn).trim() || String(s.nopdkt).trim() === String(matched.username).trim())) return true;

          // 3. Digit-level match (handles leading zero differences e.g. 0069773570 vs 69773570)
          if (userNisnDigits && userNisnDigits.length >= 6 && sNisnDigits && sNisnDigits.length >= 6) {
            if (sNisnDigits === userNisnDigits || sNisnDigits.replace(/^0+/, '') === userNisnDigits.replace(/^0+/, '')) return true;
          }
          if (userNisnDigits && sNopdktDigits) {
            if (sNopdktDigits === userNisnDigits || sNopdktDigits.replace(/^0+/, '') === userNisnDigits.replace(/^0+/, '')) return true;
          }

          // 4. Full name match
          if (userCleanName && sName && (sName === userCleanName || sName.includes(userCleanName) || userCleanName.includes(sName))) return true;

          return false;
        }
      );

      if (foundStudent) {
        // Sinkronisasi kelas dan profil riil siswa dari Google Spreadsheet ke sesi akun
        const realClassCandidates = [
          foundStudent.KelasSaatini,
          foundStudent.KelasSaatIni,
          foundStudent['Kelas Saat ini'],
          foundStudent['Kelas Saat Ini'],
          foundStudent.class,
          foundStudent.Kelas,
          foundStudent.kelas,
          foundStudent.rombel,
          foundStudent.Rombel
        ];
        let realClass = '';
        for (const cand of realClassCandidates) {
          if (cand !== undefined && cand !== null) {
            const strVal = String(cand).trim();
            if (strVal && strVal !== '-' && strVal !== 'undefined' && strVal !== 'null') {
              realClass = strVal.replace(/\bKELAS\b/gi, '').replace(/[-_]/g, '').replace(/\s+/g, '').trim();
              break;
            }
          }
        }

        matched.class = realClass;
        matched.rombel = realClass;
        matched.kelas = realClass;
        (matched as any).KelasSaatini = realClass;
        (matched as any).KelasSaatIni = realClass;
        (matched as any).nopdkt = foundStudent.nopdkt || foundStudent.nis || (matched as any).nopdkt;
        (matched as any).nis = foundStudent.nis || foundStudent.nopdkt || (matched as any).nis;
        (matched as any).nisn = foundStudent.nisn || foundStudent.NISN || matched.nipNisn;
        const rawFoto = foundStudent.fotoUrl || foundStudent.PasFoto || foundStudent.pasFoto || foundStudent.Foto || '';
        (matched as any).fotoUrl = rawFoto ? getGoogleDriveDirectImageUrl(rawFoto) : '';
        (matched as any).pasFoto = (matched as any).fotoUrl;
        (matched as any).PasFoto = (matched as any).fotoUrl;
        (matched as any).gender = foundStudent.gender || foundStudent.JenisKelamin || 'L';
        (matched as any).address = foundStudent.address || foundStudent.Alamat || foundStudent.alamat || '';
        (matched as any).nama = foundStudent.name || foundStudent.nama || foundStudent.NamaLengkap || matched.nama;
        (matched as any).name = foundStudent.name || foundStudent.nama || foundStudent.NamaLengkap || matched.name;
        
        activeStudentId = foundStudent.id || foundStudent.nopdkt || foundStudent.nisn || matched.userId;
        (matched as any).studentId = activeStudentId;
        (matched as any).userId = activeStudentId;
        (matched as any).id = activeStudentId;
      } else {
        activeStudentId = matched.userId || matched.id || (matched.username ? String(matched.username) : undefined);
      }
    }

    return {
      success: true,
      user: matched,
      roleId: finalRoleId,
      studentId: activeStudentId
    };
  }
};
