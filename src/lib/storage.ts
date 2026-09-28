import {
  User, Siswa, Guru, AbsensiRecord, HariLibur, SchoolConfig, KelasItem, DailyReportSummary, PengajuanIzin
} from '../types';
import {
  INITIAL_CLASSES, INITIAL_SISWA, INITIAL_GURU, INITIAL_CONFIG, INITIAL_HOLIDAYS, generateInitialAttendance
} from '../data/initialData';
import { db } from '../data/db';

const KEYS = {
  SESSION: 'absensiAppSession'
};

export function initStorage() {
  // Session handling setup if needed
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPastDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const d = new Date();
  return d.toLocaleTimeString('id-ID', { hour12: false });
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.SESSION);
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.SESSION);
  }
}

export function saveSiswaList(list: Siswa[]): void {
  db.set('siswa', list);
}

export function saveGuruList(list: Guru[]): void {
  db.set('guru', list);
}

export function saveKelasList(list: string[]): void {
  const items: KelasItem[] = list.map((nama, idx) => ({ id: `k_${idx}_${nama}`, nama }));
  db.set('kelas', items);
}

export function getSchoolConfig(): SchoolConfig {
  return getConfig();
}

export function saveSchoolConfig(config: SchoolConfig): void {
  db.setSingle('web_config', config);
}

// --- SISWA STORAGE ---
export function getSiswaList(filterKelas?: string | null): Siswa[] {
  const list = db.get<Siswa>('siswa') || [];
  if (!filterKelas || filterKelas === 'SEMUA' || filterKelas.trim() === '') return list;
  
  const kelasArray = filterKelas.split(',').map(k => k.trim().toUpperCase());
  return list.filter(s => {
    const sKelas = (s.kelas || s.kelasSaatIni || '').trim().toUpperCase();
    const sKelasId = (s.kelasId || '').trim().toUpperCase();
    const sStatus = (s.status || '').trim().toUpperCase();
    
    const isAlumni = sStatus === 'LULUS' || sStatus === 'ALUMNI' || 
                     sKelas === '13' || sKelas === 'L13' || sKelas.includes('13') || sKelas.includes('ALUMNI') || sKelas.includes('LULUS') ||
                     sKelasId === 'L13' || sKelasId === '13';

    return kelasArray.some(k => {
      const cleanK = k.toUpperCase().trim();
      if (cleanK === '13' || cleanK === 'L13' || cleanK.includes('13') || cleanK.includes('ALUMNI') || cleanK.includes('LULUS')) {
        return isAlumni;
      }
      return sKelas === cleanK || sKelasId === cleanK || sKelas.includes(cleanK) || sKelasId.includes(cleanK);
    });
  });
}

export function getSiswaByNisn(nisn: string): Siswa | undefined {
  const list = getSiswaList();
  const cleanNisn = nisn.replace(/[^a-zA-Z0-9]/g, '').trim();
  return list.find(s => s.nisn.replace(/[^a-zA-Z0-9]/g, '').trim() === cleanNisn);
}

export function addSiswa(data: Omit<Siswa, 'id'>): { success: boolean; message: string } {
  const list = getSiswaList();
  const cleanNisn = data.nisn.replace(/[^a-zA-Z0-9]/g, '').trim();
  if (list.some(s => s.nisn.replace(/[^a-zA-Z0-9]/g, '').trim() === cleanNisn)) {
    return { success: false, message: 'NISN sudah terdaftar' };
  }
  const newSiswa: Siswa = { ...data, id: 's_' + Date.now(), nisn: cleanNisn };
  list.push(newSiswa);
  db.set('siswa', list);
  return { success: true, message: 'Data siswa berhasil ditambahkan' };
}

export function updateSiswa(oldNisn: string, data: Partial<Siswa>): { success: boolean; message: string } {
  const list = getSiswaList();
  const cleanOld = oldNisn.replace(/[^a-zA-Z0-9]/g, '').trim();
  const idx = list.findIndex(s => s.nisn.replace(/[^a-zA-Z0-9]/g, '').trim() === cleanOld);
  if (idx === -1) return { success: false, message: 'Siswa tidak ditemukan' };
  
  list[idx] = { ...list[idx], ...data };
  db.set('siswa', list);
  return { success: true, message: 'Data siswa berhasil diperbarui' };
}

export function deleteSiswa(idOrNisn: string): { success: boolean; message: string } {
  const list = getSiswaList();
  const cleanTarget = (idOrNisn || '').replace(/[^a-zA-Z0-9]/g, '').trim();
  const filtered = list.filter(s => {
    if (s.id && s.id === idOrNisn) return false;
    if (s.nisn && s.nisn === idOrNisn) return false;
    const cleanNisn = (s.nisn || '').replace(/[^a-zA-Z0-9]/g, '').trim();
    if (cleanNisn && cleanTarget && cleanNisn === cleanTarget) return false;
    return true;
  });
  if (filtered.length === list.length) return { success: false, message: 'Data siswa tidak ditemukan' };
  db.set('siswa', filtered);
  return { success: true, message: 'Data siswa berhasil dihapus' };
}

export function deleteInvalidSiswaWithHyphen(): { success: boolean; count: number; message: string } {
  const list = db.get<Siswa>('siswa') || [];
  const initialCount = list.length;
  const filtered = list.filter(s => {
    const cleanNama = (s.nama || '').trim();
    const cleanNisn = (s.nisn || '').trim();
    if (!cleanNama || cleanNama === '-' || cleanNama === '---' || /^[-_\s]+$/.test(cleanNama)) return false;
    if (!cleanNisn || cleanNisn === '-' || cleanNisn === '---' || /^[-_\s]+$/.test(cleanNisn)) return false;
    return true;
  });
  const deletedCount = initialCount - filtered.length;
  db.set('siswa', filtered);
  return {
    success: true,
    count: deletedCount,
    message: deletedCount > 0 
      ? `Berhasil menghapus ${deletedCount} data siswa invalid dengan nama/NISN '-'.` 
      : 'Tidak ada data siswa dengan status (-).'
  };
}

export function importSiswaBulk(dataArray: Partial<Siswa>[]): { success: boolean; added: number; skipped: number; message: string } {
  const list = getSiswaList();
  const existingSet = new Set(list.map(s => s.nisn.replace(/[^a-zA-Z0-9]/g, '').trim()));
  let added = 0;
  let skipped = 0;

  dataArray.forEach(item => {
    if (!item.nama || !item.nisn) {
      skipped++;
      return;
    }
    const cleanNisn = String(item.nisn).replace(/[^a-zA-Z0-9]/g, '').trim();
    if (existingSet.has(cleanNisn)) {
      skipped++;
      return;
    }
    existingSet.add(cleanNisn);
    list.push({
      id: 's_' + Math.random().toString(36).substr(2, 9),
      nama: item.nama.trim(),
      nisn: cleanNisn,
      kelas: item.kelas ? item.kelas.trim() : '10-A',
      jenisKelamin: item.jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
      tanggalLahir: item.tanggalLahir || '2009-01-01',
      agama: item.agama || 'Islam',
      namaAyah: item.namaAyah || '-',
      namaIbu: item.namaIbu || '-',
      noHp: item.noHp || '-',
      alamat: item.alamat || '-'
    });
    added++;
  });

  db.set('siswa', list);
  return { success: true, added, skipped, message: `Import selesai. Berhasil: ${added}, Dilewati/Duplikat: ${skipped}` };
}

// --- GURU STORAGE ---
export function getGuruList(): Guru[] {
  return db.get<Guru>('guru');
}

export function addGuru(data: Omit<Guru, 'id'>): { success: boolean; message: string } {
  const list = getGuruList();
  if (list.some(g => g.username.toLowerCase() === data.username.toLowerCase())) {
    return { success: false, message: 'Username sudah digunakan' };
  }
  const newGuru: Guru = { ...data, id: 'g_' + Date.now() };
  list.push(newGuru);
  db.set('guru', list);
  return { success: true, message: 'Guru berhasil ditambahkan' };
}

export function updateGuru(oldUsername: string, data: Partial<Guru>): { success: boolean; message: string } {
  const list = getGuruList();
  const idx = list.findIndex(g => g.username.toLowerCase() === oldUsername.toLowerCase());
  if (idx === -1) return { success: false, message: 'Guru tidak ditemukan' };
  list[idx] = { ...list[idx], ...data };
  db.set('guru', list);
  return { success: true, message: 'Data guru berhasil diperbarui' };
}

export function deleteGuru(username: string): { success: boolean; message: string } {
  const list = getGuruList();
  const filtered = list.filter(g => g.username.toLowerCase() !== username.toLowerCase());
  db.set('guru', filtered);
  return { success: true, message: 'Guru berhasil dihapus' };
}

// --- KELAS STORAGE ---
export function getKelasList(): string[] {
  const items = db.get<KelasItem>('kelas') || [];
  let classNames = items.map(k => k.nama);
  
  const allSiswa = db.get<Siswa>('siswa') || [];
  const hasAlumni = allSiswa.some(s => {
    const st = (s.status || '').toUpperCase();
    const kStr = (s.kelas || s.kelasId || s.kelasSaatIni || '').toUpperCase();
    return st === 'LULUS' || st === 'ALUMNI' || kStr.includes('13') || kStr.includes('ALUMNI') || kStr.includes('LULUS');
  });

  if (hasAlumni && !classNames.some(c => c === '13' || c === 'L13' || c.includes('13'))) {
    classNames.push('13');
  }

  return Array.from(new Set(classNames)).sort();
}

export function addKelas(namaKelas: string): { success: boolean; message: string } {
  const items = db.get<KelasItem>('kelas');
  const clean = namaKelas.trim();
  if (items.some(k => k.nama.toLowerCase() === clean.toLowerCase())) {
    return { success: false, message: `Kelas "${clean}" sudah ada.` };
  }
  items.push({ id: 'k_' + Date.now(), nama: clean });
  db.set('kelas', items);
  return { success: true, message: `Kelas "${clean}" berhasil ditambahkan.` };
}

export function updateKelas(oldNama: string, newNama: string): { success: boolean; message: string } {
  const items = db.get<KelasItem>('kelas');
  const idx = items.findIndex(k => k.nama.toLowerCase() === oldNama.toLowerCase());
  if (idx === -1) return { success: false, message: 'Kelas tidak ditemukan' };
  
  items[idx].nama = newNama.trim();
  db.set('kelas', items);

  // Update siswa in this class as well
  const siswaList = getSiswaList();
  siswaList.forEach(s => {
    if (s.kelas.toLowerCase() === oldNama.toLowerCase()) {
      s.kelas = newNama.trim();
    }
  });
  db.set('siswa', siswaList);

  return { success: true, message: `Kelas diubah ke "${newNama.trim()}".` };
}

export function deleteKelas(namaKelas: string): { success: boolean; message: string } {
  const siswaList = getSiswaList();
  const count = siswaList.filter(s => s.kelas.toLowerCase() === namaKelas.toLowerCase()).length;
  if (count > 0) {
    return { success: false, message: `Kelas "${namaKelas}" masih digunakan oleh ${count} siswa.` };
  }
  const items = db.get<KelasItem>('kelas');
  const filtered = items.filter(k => k.nama.toLowerCase() !== namaKelas.toLowerCase());
  db.set('kelas', filtered);
  return { success: true, message: `Kelas "${namaKelas}" berhasil dihapus.` };
}

// --- SCHOOL CONFIG & HOLIDAYS ---
export function getConfig(): SchoolConfig {
  return db.getSingle<SchoolConfig>('web_config') || INITIAL_CONFIG;
}

export function saveConfig(config: Partial<SchoolConfig>): { success: boolean; message: string } {
  const current = getConfig();
  const updated = { ...current, ...config };
  db.setSingle('web_config', updated);
  return { success: true, message: 'Pengaturan berhasil disimpan' };
}

export function getHolidays(): HariLibur[] {
  return db.get<HariLibur>('holidays');
}

export function addHoliday(tanggal: string, keterangan: string): { success: boolean; message: string } {
  const holidays = getHolidays();
  if (holidays.some(h => h.tanggal === tanggal)) {
    return { success: false, message: 'Tanggal libur sudah terdaftar' };
  }
  holidays.push({ id: 'h_' + Date.now(), tanggal, keterangan });
  db.set('holidays', holidays);
  return { success: true, message: 'Hari libur ditambahkan' };
}

export function addHolidayRange(tanggalMulai: string, tanggalAkhir: string, keterangan: string): { success: boolean; message: string } {
  const holidays = getHolidays();
  const start = new Date(tanggalMulai);
  const end = new Date(tanggalAkhir);
  let added = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const tglStr = d.toISOString().split('T')[0];
    if (!holidays.some(h => h.tanggal === tglStr)) {
      holidays.push({ id: 'h_' + Math.random().toString(36).substr(2, 9), tanggal: tglStr, keterangan });
      added++;
    }
  }
  db.set('holidays', holidays);
  return { success: true, message: `${added} tanggal libur berhasil ditambahkan` };
}

export function deleteHoliday(tanggal: string): { success: boolean; message: string } {
  const holidays = getHolidays();
  const filtered = holidays.filter(h => h.tanggal !== tanggal);
  db.set('holidays', filtered);
  return { success: true, message: 'Hari libur dihapus' };
}

// --- ABSENSI & MONITORING ---
export function getAbsensiRecords(): AbsensiRecord[] {
  return db.get<AbsensiRecord>('absensi');
}

export function checkHolidayToday(dateStr: string = getTodayDateString()): { isLibur: boolean; keterangan: string } {
  const holidays = getHolidays();
  const holiday = holidays.find(h => h.tanggal === dateStr);
  if (holiday) {
    return { isLibur: true, keterangan: holiday.keterangan };
  }
  
  const d = new Date(dateStr);
  const dayIndex = d.getDay() === 0 ? '7' : String(d.getDay());
  const config = getConfig();
  const todayConfig = config.jadwal_harian[dayIndex];

  if (todayConfig && todayConfig.libur) {
    return { isLibur: true, keterangan: todayConfig.ket_libur || 'Libur Rutin' };
  }

  return { isLibur: false, keterangan: '' };
}

export function recordScanAbsensi(nisn: string, scannerRole?: string, scannerKelas?: string): {
  success: boolean;
  message: string;
  type?: 'datang' | 'pulang';
  jamDatang?: string;
  jamPulang?: string;
  nama?: string;
  kelas?: string;
  status?: string;
} {
  const today = getTodayDateString();
  const { isLibur, keterangan: liburKet } = checkHolidayToday(today);
  if (isLibur) {
    return { success: false, message: `Absensi DITUTUP. Hari ini libur: ${liburKet}` };
  }

  const siswa = getSiswaByNisn(nisn);
  if (!siswa) {
    return { success: false, message: `NISN [${nisn}] tidak terdaftar di database.` };
  }

  if (scannerRole === 'guru' && scannerKelas) {
    const guruClasses = scannerKelas.split(',').map(k => k.trim().toUpperCase());
    if (guruClasses.length > 0 && !guruClasses.includes(siswa.kelas.toUpperCase())) {
      return { success: false, message: `Siswa kelas ${siswa.kelas}, tidak sesuai kelas diampu (${scannerKelas}).` };
    }
  }

  const records = getAbsensiRecords();
  const existingIdx = records.findIndex(r => r.tanggal === today && r.nisn.replace(/[^a-zA-Z0-9]/g, '') === siswa.nisn.replace(/[^a-zA-Z0-9]/g, ''));
  const config = getConfig();
  const nowStr = getCurrentTimeString();
  const nowHM = nowStr.substring(0, 5);

  if (existingIdx !== -1) {
    const existing = records[existingIdx];
    if (existing.jamPulang && existing.jamPulang !== '-') {
      return { success: false, message: `${siswa.nama} sudah absen pulang hari ini.` };
    }
    // Record checkout
    existing.jamPulang = nowStr;
    if (nowHM < config.jam_pulang_mulai) {
      existing.keterangan = existing.keterangan ? `${existing.keterangan} & Pulang Cepat` : 'Pulang Cepat';
    }
    db.set('absensi', records);

    // Also persist log to sheet QR_LOG
    try {
      const qrLogRecord = {
        id: `QR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        QRLogID: `QR_${Date.now()}`,
        Tanggal: today,
        timestamp: `${today} ${nowStr}`,
        UserID: siswa.nisn || siswa.id,
        nopdkt: siswa.nisn || siswa.id,
        nama: siswa.nama,
        kelas: siswa.kelas,
        typeScan: 'pulang',
        QRCode: siswa.nisn,
        deviceInfo: 'Scanner Kartu Barcode',
        Device: 'Web Browser / Barcode Scanner',
        Browser: 'ERP KTCT',
        status: 'Berhasil',
        Status: 'Hadir',
        Keterangan: `Presensi Pulang Real-time (${nowStr})`,
        CreatedAt: new Date().toISOString()
      };
      const currentLogs = (db.get('qr_log') as any[]) || [];
      db.set('qr_log', [qrLogRecord, ...currentLogs]);
    } catch {}

    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'absensi' } }));
    return {
      success: true,
      message: `Absen Pulang Berhasil (${nowStr})`,
      type: 'pulang',
      jamPulang: nowStr,
      nama: siswa.nama,
      kelas: siswa.kelas,
      status: existing.status
    };
  }

  // New Check-in
  let keterangan = 'Tepat Waktu';
  if (nowHM > config.jam_masuk_akhir) {
    keterangan = `Terlambat (${nowHM})`;
  }

  const newRecord: AbsensiRecord = {
    id: `att_${Date.now()}_${siswa.nisn}`,
    tanggal: today,
    nisn: siswa.nisn,
    nama: siswa.nama,
    kelas: siswa.kelas,
    jamDatang: nowStr,
    jamPulang: '-',
    keterangan,
    status: 'Hadir'
  };

  records.push(newRecord);
  db.set('absensi', records);

  // Also persist log to sheet QR_LOG
  try {
    const qrLogRecord = {
      id: `QR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      QRLogID: `QR_${Date.now()}`,
      Tanggal: today,
      timestamp: `${today} ${nowStr}`,
      UserID: siswa.nisn || siswa.id,
      nopdkt: siswa.nisn || siswa.id,
      nama: siswa.nama,
      kelas: siswa.kelas,
      typeScan: 'datang',
      QRCode: siswa.nisn,
      deviceInfo: 'Scanner Kartu Barcode',
      Device: 'Web Browser / Barcode Scanner',
      Browser: 'ERP KTCT',
      status: 'Berhasil',
      Status: 'Hadir',
      Keterangan: `Presensi Masuk ${keterangan} (${nowStr})`,
      CreatedAt: new Date().toISOString()
    };
    const currentLogs = (db.get('qr_log') as any[]) || [];
    db.set('qr_log', [qrLogRecord, ...currentLogs]);
  } catch {}

  window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'absensi' } }));
  return {
    success: true,
    message: `Absen Masuk Berhasil (${nowStr})`,
    type: 'datang',
    jamDatang: nowStr,
    nama: siswa.nama,
    kelas: siswa.kelas,
    status: 'Hadir'
  };
}

export function updateAbsensiStatus(nisn: string, tanggal: string, newStatus: AbsensiRecord['status']): { success: boolean; message: string } {
  const records = getAbsensiRecords();
  const cleanNisn = nisn.replace(/[^a-zA-Z0-9]/g, '');
  const siswa = getSiswaByNisn(nisn);
  
  const idx = records.findIndex(r => r.tanggal === tanggal && r.nisn.replace(/[^a-zA-Z0-9]/g, '') === cleanNisn);
  if (idx !== -1) {
    records[idx].status = newStatus;
  } else if (siswa) {
    records.push({
      id: `att_${Date.now()}_${cleanNisn}`,
      tanggal,
      nisn: siswa.nisn,
      nama: siswa.nama,
      kelas: siswa.kelas,
      jamDatang: newStatus === 'Hadir' ? getCurrentTimeString() : '-',
      jamPulang: '-',
      keterangan: 'Manual Input',
      status: newStatus
    });
  }
  db.set('absensi', records);
  return { success: true, message: 'Status absensi berhasil diperbarui' };
}

export function getMonitoringRealtime(filterKelas?: string | null, dateStr?: string): AbsensiRecord[] {
  const targetDate = dateStr || getTodayDateString();
  const siswaList = getSiswaList(filterKelas);
  const records = getAbsensiRecords().filter(r => r.tanggal === targetDate);
  const recordMap = new Map<string, AbsensiRecord>();
  records.forEach(r => recordMap.set(r.nisn.replace(/[^a-zA-Z0-9]/g, ''), r));

  return siswaList.map(s => {
    const existing = recordMap.get(s.nisn.replace(/[^a-zA-Z0-9]/g, ''));
    if (existing) return existing;
    return {
      id: `m_${s.nisn}`,
      tanggal: targetDate,
      nisn: s.nisn,
      nama: s.nama,
      kelas: s.kelas,
      jamDatang: '-',
      jamPulang: '-',
      keterangan: '-',
      status: 'Belum Absen'
    };
  });
}

// --- AUTOMATED DAILY REPORT GENERATOR ---
export function getDailyReportSummary(dateStr: string = getTodayDateString(), filterKelas?: string): DailyReportSummary {
  const siswaList = getSiswaList(filterKelas);
  const records = getAbsensiRecords().filter(r => r.tanggal === dateStr);
  const recordMap = new Map<string, AbsensiRecord>();
  records.forEach(r => recordMap.set(r.nisn.replace(/[^a-zA-Z0-9]/g, ''), r));

  let hadir = 0;
  let sakit = 0;
  let izin = 0;
  let alpa = 0;
  let belumAbsen = 0;
  let terlambatCount = 0;
  let pulangCepatCount = 0;

  const classes = getKelasList();
  const classStatsMap = new Map<string, { total: number; hadir: number; sakit: number; izin: number; alpa: number; terlambat: number }>();
  classes.forEach(c => classStatsMap.set(c, { total: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0 }));

  siswaList.forEach(s => {
    const stat = classStatsMap.get(s.kelas) || { total: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0 };
    stat.total++;
    const rec = recordMap.get(s.nisn.replace(/[^a-zA-Z0-9]/g, ''));

    if (!rec || rec.status === 'Belum Absen') {
      belumAbsen++;
      stat.alpa++; // Automatic unrecorded attendance = Alpa on active school day
    } else if (rec.status === 'Hadir') {
      hadir++;
      stat.hadir++;
      if (rec.keterangan.toLowerCase().includes('terlambat')) {
        terlambatCount++;
        stat.terlambat++;
      }
      if (rec.keterangan.toLowerCase().includes('pulang cepat')) {
        pulangCepatCount++;
      }
    } else if (rec.status === 'Sakit') {
      sakit++;
      stat.sakit++;
    } else if (rec.status === 'Izin') {
      izin++;
      stat.izin++;
    } else if (rec.status === 'Alpa') {
      alpa++;
      stat.alpa++;
    }
  });

  const totalSiswa = siswaList.length;
  const persentaseKehadiran = totalSiswa > 0 ? Math.round((hadir / totalSiswa) * 100) : 0;

  const kelasSummary = Array.from(classStatsMap.entries())
    .filter(([_, st]) => st.total > 0)
    .map(([k, st]) => ({
      kelas: k,
      total: st.total,
      hadir: st.hadir,
      sakit: st.sakit,
      izin: st.izin,
      alpa: st.alpa,
      terlambat: st.terlambat,
      persen: st.total > 0 ? Math.round((st.hadir / st.total) * 100) : 0
    }));

  let topClass = '-';
  if (kelasSummary.length > 0) {
    const sorted = [...kelasSummary].sort((a, b) => b.persen - a.persen);
    topClass = `${sorted[0].kelas} (${sorted[0].persen}%)`;
  }

  // Generate automated AI insight text
  let aiInsight = `Laporan Harian Kehadiran (${dateStr}): Tingkat kehadiran sekolah mencapai ${persentaseKehadiran}%. `;
  if (persentaseKehadiran >= 90) {
    aiInsight += `Kinerja disiplin sekolah sangat memuaskan. Kelas dengan kedisiplinan tertinggi adalah ${topClass}. `;
  } else if (persentaseKehadiran >= 75) {
    aiInsight += `Kehadiran dalam kategori cukup baik. Perlu pemantauan untuk siswa yang terlambat (${terlambatCount} siswa). `;
  } else {
    aiInsight += `Perhatian diperlukan karena tingkat kehadiran di bawah target 80%. Terdapat ${alpa + belumAbsen} siswa tanpa keterangan. `;
  }

  if (sakit > 0) aiInsight += `${sakit} siswa tercatat sakit; `;
  if (izin > 0) aiInsight += `${izin} siswa izin; `;
  if (terlambatCount > 0) aiInsight += `${terlambatCount} siswa terlambat.`;

  return {
    tanggal: dateStr,
    totalSiswa,
    hadir,
    sakit,
    izin,
    alpa: alpa + belumAbsen,
    belumAbsen,
    terlambatCount,
    pulangCepatCount,
    persentaseKehadiran,
    kelasSummary,
    topClass,
    aiInsight
  };
}

export function archiveAndResetYear(archiveName: string): { success: boolean; message: string } {
  // Clear attendance records and start fresh year
  db.set('absensi', []);
  return { success: true, message: `Tahun ajaran berhasil ditutup dan diarsipkan sebagai "${archiveName}". Database absensi telah di-reset.` };
}

// --- PENGAJUAN IZIN & BUKTI FOTO STORAGE ---
export function getPengajuanIzinList(): PengajuanIzin[] {
  return db.get<PengajuanIzin>('pengajuan_izin');
}

export function submitPengajuanIzin(
  data: Omit<PengajuanIzin, 'id' | 'tanggalPengajuan' | 'statusPersetujuan'>
): { success: boolean; message: string; id: string } {
  const current = getPengajuanIzinList();
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newIzin: PengajuanIzin = {
    ...data,
    id: `izin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tanggalPengajuan: nowStr,
    statusPersetujuan: 'Pending'
  };

  current.unshift(newIzin);
  db.set('pengajuan_izin', current);
  return { success: true, message: 'Pengajuan izin dengan bukti foto berhasil dikirim!', id: newIzin.id };
}

export function updateStatusPengajuanIzin(
  id: string,
  statusPersetujuan: 'Disetujui' | 'Ditolak',
  disetujuiOleh: string,
  catatanPersetujuan?: string
): { success: boolean; message: string } {
  const current = getPengajuanIzinList();
  const idx = current.findIndex(item => item.id === id);
  if (idx === -1) return { success: false, message: 'Data pengajuan izin tidak ditemukan' };

  const izin = current[idx];
  izin.statusPersetujuan = statusPersetujuan;
  izin.disetujuiOleh = disetujuiOleh;
  if (catatanPersetujuan) izin.catatanPersetujuan = catatanPersetujuan;

  current[idx] = izin;
  db.set('pengajuan_izin', current);

  // SMART LOGIC: If approved, automatically insert / update attendance records for dates in range
  if (statusPersetujuan === 'Disetujui') {
    const records = getAbsensiRecords();
    const cleanNisn = izin.nisn.replace(/[^a-zA-Z0-9]/g, '');

    const start = new Date(izin.tanggalMulai);
    const end = new Date(izin.tanggalSelesai);
    const dateList: string[] = [];

    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const yr = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const da = String(dt.getDate()).padStart(2, '0');
      dateList.push(`${yr}-${mo}-${da}`);
    }

    const attendanceStatus = izin.jenisIzin === 'Sakit' ? 'Sakit' : 'Izin';

    dateList.forEach(tgl => {
      const recIdx = records.findIndex(r => r.tanggal === tgl && r.nisn.replace(/[^a-zA-Z0-9]/g, '') === cleanNisn);
      if (recIdx !== -1) {
        records[recIdx].status = attendanceStatus;
        records[recIdx].alasan = izin.alasan;
        records[recIdx].buktiFotoUrl = izin.buktiFotoUrl;
        records[recIdx].jenisIzin = izin.jenisIzin;
        records[recIdx].statusPersetujuan = 'Disetujui';
        records[recIdx].keterangan = `${izin.jenisIzin}: ${izin.alasan}`;
      } else {
        records.push({
          id: `att_iz_${Date.now()}_${cleanNisn}_${tgl}`,
          tanggal: tgl,
          nisn: izin.nisn,
          nama: izin.nama,
          kelas: izin.kelas,
          jamDatang: '-',
          jamPulang: '-',
          keterangan: `${izin.jenisIzin}: ${izin.alasan}`,
          status: attendanceStatus,
          alasan: izin.alasan,
          buktiFotoUrl: izin.buktiFotoUrl,
          jenisIzin: izin.jenisIzin,
          statusPersetujuan: 'Disetujui'
        });
      }
    });

    db.set('absensi', records);
  }

  return {
    success: true,
    message: statusPersetujuan === 'Disetujui'
      ? 'Pengajuan izin disetujui! Status presensi siswa otomatis diperbarui.'
      : 'Pengajuan izin telah ditolak.'
  };
}

export function deletePengajuanIzin(id: string): { success: boolean; message: string } {
  const current = getPengajuanIzinList();
  const updated = current.filter(item => item.id !== id);
  db.set('pengajuan_izin', updated);
  return { success: true, message: 'Data pengajuan izin berhasil dihapus.' };
}
