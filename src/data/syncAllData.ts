import { db } from './db';
import { DEFAULT_APP_CONFIG } from './config';
import {
  SEED_CLASSES,
  SEED_MAPEL,
  SEED_TAHUN_AJARAN,
  SEED_SEMESTER,
  SEED_HARI_LIBUR,
  SEED_TARIF_BIAYA
} from './seedMasterData';
import { generateDapodikValidasiRows } from '../lib/dapodikValidator';
import { MASTER_REFERENSI_DATA } from './masterReferensiData';
import { INITIAL_SAMPLE_DATA } from './schemas';
import { validateKurikulumModulSchema, validateMasterSilabusSchema } from './kurikulumModulData';
import { isDummyQuestion, isDummyBankSoalPackage } from './soalGenerator';
import { OFFICIAL_CP_ATP_DATA } from './cpAtpData';
import { normalizeSemesterType } from '../lib/semester';
import {
  formatBiayaForSheet,
  formatTagihanForSheet,
  formatPembayaranForSheet,
  formatTabunganForSheet
} from '../lib/keuanganNormalizers';
import { generateJadwalItemsFromMaster } from './masterJadwalData';
import { JADWAL_STS_GANJIL_2026 } from './jadwalStsGanjil2026';
import { matchStatusActive } from '../lib/utils';

export interface SyncPayloadResult {
  totalTables: number;
  totalRecords: number;
  tables: { [tableName: string]: any[] };
}

/**
 * Mengumpulkan seluruh data yang tersimpan di aplikasi (Store & LocalStorage DB)
 * untuk dikirimkan secara serentak ke Google Spreadsheet.
 */
export function getAllAppDataForSync(storeStudents: any[] = [], storeTeachers: any[] = [], currentSettings: any = {}): { [tableName: string]: any[] } {
  const dataMap: { [tableName: string]: any[] } = {};

  // 1. SISTEM & AUTENTIKASI
  const currentTP = (currentSettings.tahunPelajaran || currentSettings.activeAcademicYear || '2026/2027').trim();
  const currentSem = (currentSettings.semester === 'Genap' || currentSettings.activeSemester === 'Genap') ? 'Genap' : 'Ganjil';

  const profileSettings = {
    ...DEFAULT_APP_CONFIG,
    ...currentSettings,
    ...(db.getSingle('profil_sekolah') || {}),
    tahunPelajaran: currentTP,
    activeAcademicYear: currentTP,
    tahunAjaranAktif: currentTP,
    semester: currentSem,
    activeSemester: currentSem,
    semesterAktif: currentSem
  };

  const settingMetadata: Record<string, { desc: string; cat: string }> = {
    schoolName: { desc: 'Nama Resmi Lembaga / Sekolah', cat: 'Profil Lembaga' },
    schoolAddress: { desc: 'Alamat Lengkap Satuan Pendidikan', cat: 'Profil Lembaga' },
    schoolPhone: { desc: 'Nomor Telepon Resmi Sekolah', cat: 'Kontak Lembaga' },
    schoolEmail: { desc: 'Alamat Email Resmi Sekolah', cat: 'Kontak Lembaga' },
    schoolNpsn: { desc: 'Nomor Pokok Sekolah Nasional (NPSN)', cat: 'Legalitas Lembaga' },
    schoolNss: { desc: 'Nomor Statistik Sekolah (NSS)', cat: 'Legalitas Lembaga' },
    headmaster: { desc: 'Nama Lengkap Kepala Sekolah', cat: 'Pimpinan Lembaga' },
    nipHeadmaster: { desc: 'NIP / NUPTK Kepala Sekolah', cat: 'Pimpinan Lembaga' },
    scriptUrl: { desc: 'URL Endpoint Google Apps Script (Web App)', cat: 'Integrasi Cloud' },
    gasUrl: { desc: 'URL Cadangan Google Apps Script', cat: 'Integrasi Cloud' },
    spreadsheetId: { desc: 'ID Google Spreadsheet Master Database', cat: 'Integrasi Cloud' },
    driveFolderId: { desc: 'ID Root Folder Google Drive Penyimpanan Berkas', cat: 'Integrasi Cloud' },
    activeAcademicYear: { desc: 'Tahun Ajaran Aktif Berjalan', cat: 'Akademik' },
    activeSemester: { desc: 'Semester Aktif Berjalan', cat: 'Akademik' },
    tahunPelajaran: { desc: 'Tahun Pelajaran Sistem', cat: 'Akademik' },
    tahunAjaranAktif: { desc: 'Tahun Ajaran Aktif Terpilih', cat: 'Akademik' },
    semester: { desc: 'Semester Sistem (Ganjil/Genap)', cat: 'Akademik' },
    semesterAktif: { desc: 'Semester Aktif Terpilih', cat: 'Akademik' },
    appVersion: { desc: 'Versi Rilis Aplikasi SISTA ERP', cat: 'Sistem' },
    systemStatus: { desc: 'Status Operasional Sistem Aplikasi', cat: 'Sistem' },
    theme: { desc: 'Tema Tampilan Antarmuka Pengguna', cat: 'Pengaturan Tampilan' },
  };

  const nowIso = new Date().toISOString();
  const nowDateStr = nowIso.split('T')[0];

  // Helper format NISN/NIK/ID agar angka 0 di depan (leading zero) tidak hilang saat diekspor ke Google Sheets
  const formatTextSafe = (val: any) => {
    if (val === undefined || val === null || val === '') return '-';
    const str = String(val).trim();
    if (!str || str === '-') return '-';
    return str.startsWith("'") ? str : `'${str}`;
  };

  dataMap['SETTING'] = Object.keys(profileSettings).map(k => ({
    Key: k,
    Value: typeof profileSettings[k] === 'object' ? JSON.stringify(profileSettings[k]) : String(profileSettings[k] ?? ''),
    Deskripsi: settingMetadata[k]?.desc || `Pengaturan Sistem untuk konfigurasi [${k}]`,
    Kategori: settingMetadata[k]?.cat || 'Konfigurasi Sistem',
    UpdatedAt: nowIso
  }));

  const dbReferensi = db.get('referensi');
  dataMap['REFERENSI'] = (dbReferensi && dbReferensi.length > 0) ? dbReferensi : [];
  const dbUsers = db.get('users');
  const fallbackUsers = INITIAL_SAMPLE_DATA.USERS || [];
  const rawUsers = (dbUsers && dbUsers.length > 0) ? dbUsers : fallbackUsers;
  dataMap['USERS'] = rawUsers.map((u: any, idx: number) => ({
    UserID: formatTextSafe(u.UserID || u.userId || u.id || `USR_${String(idx + 1).padStart(3, '0')}`),
    Username: u.Username || u.username || `user${idx + 1}`,
    Password: u.Password || u.password || '123456',
    RoleID: u.RoleID || u.roleId || u.role || 'RL-001',
    Nama: u.Nama || u.name || u.namaLengkap || u.NamaLengkap || 'Pengguna Sistem',
    NIP_NISN: formatTextSafe(u.NIP_NISN || u.nip_nisn || u.nip || u.nisn || u.nopdkt || '-'),
    Email: u.Email || u.email || '',
    NoHP: formatTextSafe(u.NoHP || u.noHp || u.phone || ''),
    Status: u.Status || u.status || 'Aktif',
    LastLogin: u.LastLogin || u.lastLogin || nowIso,
    Token: u.Token || u.token || '',
    CreatedAt: u.CreatedAt || u.createdAt || nowIso,
    UpdatedAt: u.UpdatedAt || u.updatedAt || nowIso
  }));
  const dbRole = db.get('role');
  const fallbackRoles = INITIAL_SAMPLE_DATA.ROLE || [];
  const rawRoles = (dbRole && dbRole.length > 0) ? dbRole : fallbackRoles;
  dataMap['ROLE'] = rawRoles.map((r: any, idx: number) => ({
    RoleID: r.RoleID || r.roleId || r.id || `RL-${String(idx + 1).padStart(3, '0')}`,
    NamaRole: r.NamaRole || r.namaRole || r.name || `ROLE_${idx + 1}`,
    Kategori: r.Kategori || r.kategori || 'Sistem & IT',
    Keterangan: r.Keterangan || r.deskripsi || r.keterangan || '-',
    JumlahUser: Number(r.JumlahUser || r.jumlahUser || 1),
    Aktif: r.Aktif || r.aktif || 'YA'
  }));

  const dbMenu = db.get('menu');
  const fallbackMenus = INITIAL_SAMPLE_DATA.MENU || [];
  const rawMenus = (dbMenu && dbMenu.length > 0) ? dbMenu : fallbackMenus;
  dataMap['MENU'] = rawMenus.map((m: any, idx: number) => ({
    MenuID: m.MenuID || m.idMenu || m.id || `MN-${String(idx + 1).padStart(2, '0')}`,
    ParentID: m.ParentID || m.parentMenu || m.parentId || 'ROOT',
    NamaMenu: m.NamaMenu || m.namaMenu || m.title || `Menu ${idx + 1}`,
    Icon: m.Icon || m.icon || 'Folder',
    URL: m.URL || m.route || m.url || m.path || `/menu-${idx + 1}`,
    Urutan: Number(m.Urutan || m.urutan || idx + 1),
    Status: m.Status || m.aktif || 'AKTIF'
  }));

  const dbHakAkses = db.get('hak_akses');
  const fallbackHakAkses = INITIAL_SAMPLE_DATA.HAK_AKSES || [];
  const rawHakAkses = (dbHakAkses && dbHakAkses.length > 0) ? dbHakAkses : fallbackHakAkses;
  dataMap['HAK_AKSES'] = rawHakAkses.map((h: any, idx: number) => ({
    HakAksesID: h.HakAksesID || h.hakAksesId || h.id || `HA-${String(idx + 1).padStart(3, '0')}`,
    RoleID: h.RoleID || h.roleId || (h.role ? (h.role.startsWith('RL-') ? h.role : `RL-${h.role}`) : `RL-001`),
    MenuID: h.MenuID || h.menuId || h.menu || 'MN-01',
    Create: h.Create || h.canCreate || h.dapatTambah || 'TIDAK',
    Read: h.Read || h.canRead || h.dapatLihat || 'YA',
    Update: h.Update || h.canEdit || h.dapatEdit || 'TIDAK',
    Delete: h.Delete || h.canDelete || h.dapatHapus || 'TIDAK',
    Approve: h.Approve || h.canApprove || 'TIDAK',
    Export: h.Export || h.canExport || 'YA',
    Import: h.Import || h.canImport || 'TIDAK',
    role: h.role || h.NamaRole || h.RoleID || 'SUPERADMIN',
    dapatLihat: h.dapatLihat || h.Read || h.canRead || 'YA',
    dapatTambah: h.dapatTambah || h.Create || h.canCreate || 'TIDAK',
    dapatEdit: h.dapatEdit || h.Update || h.canEdit || 'TIDAK',
    dapatHapus: h.dapatHapus || h.Delete || h.canDelete || 'TIDAK'
  }));

  // SESSIONS
  const rawSessions = db.get('session');
  const rawSessionsPlural = db.get('sessions');
  const combinedSessions = [...rawSessions, ...rawSessionsPlural];
  if (combinedSessions.length > 0) {
    dataMap['SESSIONS'] = combinedSessions.map((s: any, idx: number) => ({
      SessionID: s.SessionID || s.sessionId || s.id || `SES-${Date.now()}-${idx + 1}`,
      UserID: s.UserID || s.userId || 'USR-ADMIN',
      Username: s.Username || s.username || s.user || 'Administrator',
      Token: s.Token || s.token || `token-${Math.random().toString(36).substring(2, 12)}`,
      IPAddress: s.IPAddress || s.ipAddress || s.ip || '127.0.0.1',
      Device: s.Device || s.device || 'Desktop PC (Web Browser)',
      LoginAt: s.LoginAt || s.loginAt || s.createdAt || nowIso,
      ExpiredAt: s.ExpiredAt || s.expiredAt || new Date(Date.now() + 86400000).toISOString(),
      Status: s.Status || s.status || 'Aktif'
    }));
  } else {
    dataMap['SESSIONS'] = [
      {
        SessionID: `SES-${Date.now()}-ADMIN`,
        UserID: 'USR-ADMIN',
        Username: 'Administrator',
        Token: `jwt-auth-${Math.random().toString(36).substring(2, 12)}`,
        IPAddress: '127.0.0.1',
        Device: 'Desktop PC (Chrome)',
        LoginAt: nowIso,
        ExpiredAt: new Date(Date.now() + 86400000).toISOString(),
        Status: 'Aktif'
      }
    ];
  }

  // LOG
  const rawLogs = db.get('logs');
  const rawActLogs = db.get('activity_logs');
  const auditLogsForFallback = db.get('audit_logs');
  const combinedLogs = [...rawLogs, ...rawActLogs];

  if (combinedLogs.length > 0) {
    dataMap['LOG'] = combinedLogs.map((l: any, idx: number) => ({
      LogID: l.LogID || l.logId || l.id || `LOG-${Date.now()}-${idx + 1}`,
      UserID: l.UserID || l.userId || 'USR-ADMIN',
      Username: l.Username || l.username || l.user || 'Administrator',
      Tanggal: l.Tanggal || l.tanggal || (l.timestamp ? String(l.timestamp).split(' ')[0] : nowDateStr),
      Aktivitas: l.Aktivitas || l.aktivitas || l.rincian || l.action || 'Aktivitas Sistem Aplikasi',
      Modul: l.Modul || l.modul || 'Sistem',
      IP: l.IP || l.ip || l.ipAddress || '127.0.0.1',
      Device: l.Device || l.device || 'Desktop PC',
      Browser: l.Browser || l.browser || 'Google Chrome / Browser App',
      CreatedAt: l.CreatedAt || l.createdAt || l.timestamp || nowIso
    }));
  } else if (auditLogsForFallback.length > 0) {
    dataMap['LOG'] = auditLogsForFallback.map((a: any, idx: number) => ({
      LogID: a.id || `LOG-${Date.now()}-${idx + 1}`,
      UserID: a.userId || 'USR-ADMIN',
      Username: a.user || 'Administrator',
      Tanggal: a.timestamp ? String(a.timestamp).split(' ')[0] : nowDateStr,
      Aktivitas: `[${a.aksi || 'AKSES'}] ${a.target || 'Modul'}: ${a.rincian || 'Aktivitas Pengguna'}`,
      Modul: a.modul || 'Sistem',
      IP: a.ipAddress || '127.0.0.1',
      Device: 'Desktop PC',
      Browser: 'Google Chrome / Browser App',
      CreatedAt: a.timestamp || nowIso
    }));
  } else {
    dataMap['LOG'] = [];
  }

  // AUDIT_LOG
  const rawAudit = db.get('audit_log');
  const rawAuditLogs = db.get('audit_logs');
  const combinedAudit = [...rawAudit, ...rawAuditLogs];

  if (combinedAudit.length > 0) {
    dataMap['AUDIT_LOG'] = combinedAudit.map((a: any, idx: number) => ({
      AuditID: a.AuditID || a.auditId || a.id || `AUDIT-${Date.now()}-${idx + 1}`,
      UserID: a.UserID || a.userId || 'USR-ADMIN',
      Username: a.Username || a.username || a.user || 'Administrator',
      Tabel: a.Tabel || a.tabel || a.table || a.modul || 'SISWA',
      RecordID: a.RecordID || a.recordId || a.target || 'REC-ALL',
      Field: a.Field || a.field || a.aksi || 'UPDATE',
      ValueLama: a.ValueLama !== undefined ? String(a.ValueLama) : (a.valueLama !== undefined ? String(a.valueLama) : '-'),
      ValueBaru: a.ValueBaru !== undefined ? String(a.ValueBaru) : (a.valueBaru !== undefined ? String(a.valueBaru) : (a.rincian || 'Selesai')),
      Tanggal: a.Tanggal || a.tanggal || (a.timestamp ? String(a.timestamp).split(' ')[0] : nowDateStr),
      CreatedAt: a.CreatedAt || a.createdAt || a.timestamp || nowIso
    }));
  } else {
    dataMap['AUDIT_LOG'] = [];
  }

  dataMap['NOTIFIKASI'] = db.get('notifikasi');

  // 2. KESISWAAN & GTK
  const students = storeStudents && storeStudents.length > 0 ? storeStudents : db.get('students');
  dataMap['SISWA'] = (students || []).map((s: any, idx: number) => {
    const cleanRt = String(s.rt || s.RT || '').replace(/^RT[\s.:]*/i, '').trim();
    const cleanRw = String(s.rw || s.RW || '').replace(/^RW[\s.:]*/i, '').trim();
    const pdkt = formatTextSafe(s.NoPDKT || s.nopdkt || s.nis || `PDKT-${idx + 1}`);
    return {
      NoPDKT: pdkt,
      TahunMasuk: s.TahunMasuk || '',
      NISN: formatTextSafe(s.NISN),
      NamaLengkap: s.NamaLengkap || '',
      JenisKelamin: s.JenisKelamin || 'L',
      TempatLahir: s.TempatLahir || '',
      TanggalLahir: s.TanggalLahir || '',
      NIK: formatTextSafe(s.NIK),
      AnakKe: s.AnakKe || '',
      Saudara: s.Saudara || '',
      Agama: s.Agama || 'Islam',
      GolonganDarah: s.GolonganDarah || '-',
      TinggiBadan: s.TinggiBadan || '',
      BeratBadan: s.BeratBadan || '',
      Prestasi: s.Prestasi || '',
      Hobi: s.Hobi || '',
      CatatanPenting: s.CatatanPenting || '',
      Alamat: s.Alamat || '',
      RT: cleanRt || s.RT || '-',
      RW: cleanRw || s.RW || '-',
      Kelurahan: s.Kelurahan || '',
      Kecamatan: s.Kecamatan || 'Tambora',
      Kota: s.Kota || 'Jakarta Barat',
      Provinsi: s.Provinsi || 'DKI Jakarta',
      KodePos: s.KodePos || '11220',
      JenisTinggal: s.JenisTinggal || '',
      AlatTransportasi: s.AlatTransportasi || '',
      NomorHP: formatTextSafe(s.NomorHP),
      Email: s.Email || '',
      AsalSekolah: s.AsalSekolah || '',
      SKHUN: s.SKHUN || '',
      PenerimaKPS: s.PenerimaKPS || '',
      PasFoto: s.PasFoto || '',
      NomorKartuKeluarga: formatTextSafe(s.NomorKartuKeluarga),
      NamaAyah: s.NamaAyah || '',
      NIKAyah: formatTextSafe(s.NIKAyah),
      TempatLahirAyah: s.TempatLahirAyah || '',
      TanggalLahirAyah: s.TanggalLahirAyah || '',
      PendidikanAyah: s.PendidikanAyah || '',
      PekerjaanAyah: s.PekerjaanAyah || '',
      PenghasilanAyah: s.PenghasilanAyah || '',
      TeleponAyah: formatTextSafe(s.TeleponAyah),
      StatusAyah: s.StatusAyah || '',
      NamaIbu: s.NamaIbu || '',
      NIKIbu: formatTextSafe(s.NIKIbu),
      TempatLahirIbu: s.TempatLahirIbu || '',
      TanggalLahirIbu: s.TanggalLahirIbu || '',
      PendidikanIbu: s.PendidikanIbu || '',
      PekerjaanIbu: s.PekerjaanIbu || '',
      PenghasilanIbu: s.PenghasilanIbu || '',
      TeleponIbu: formatTextSafe(s.TeleponIbu),
      StatusIbu: s.StatusIbu || '',
      StatusYatim: s.StatusYatim || '',
      NamaWali: s.NamaWali || '',
      TempatLahirWali: s.TempatLahirWali || '',
      TanggalLahirWali: s.TanggalLahirWali || '',
      PendidikanWali: s.PendidikanWali || '',
      PekerjaanWali: s.PekerjaanWali || '',
      PenghasilanWali: s.PenghasilanWali || '',
      Hubungan: s.Hubungan || '',
      TeleponWali: formatTextSafe(s.TeleponWali),
      AktaKelahiran: s.AktaKelahiran || '',
      KartuKeluarga: s.KartuKeluarga || '',
      KIA: s.KIA || '',
      KTPAyah: s.KTPAyah || '',
      KTPIbu: s.KTPIbu || '',
      Ijazah: s.Ijazah || '',
      KTPWali: s.KTPWali || '',
      Rapor: s.Rapor || '',
      SuratPindah: s.SuratPindah || '',
      SuratKeterangan: s.SuratKeterangan || '',
      SuratDomisili: s.SuratDomisili || '',
      Status: s.Status || 'Aktif',
      KelasSaatIni: s.KelasSaatIni || ''
    };
  });

  const teachers = storeTeachers && storeTeachers.length > 0 ? storeTeachers : db.get('teachers');
  dataMap['GURU'] = (teachers || []).map((t: any, idx: number) => ({
    ...t,
    id: formatTextSafe(t.id || t.nip || `GURU-${idx + 1}`),
    nip: formatTextSafe(t.nip || t.NIP || ''),
    nik: formatTextSafe(t.nik || t.NIK || ''),
    phone: formatTextSafe(t.phone || t.noHp || t.telepon || '')
  }));

  // Auto-generate Ortu & Yatim jika belum ada
  const savedOrtu = db.get('orang_tua');
  if (savedOrtu.length > 0) {
    dataMap['ORANG_TUA'] = savedOrtu.map((o: any, idx: number) => ({
      ...o,
      OrtuID: formatTextSafe(o.OrtuID || o.ortuId || `ORTU-${idx + 1}`),
      SiswaID: formatTextSafe(o.SiswaID || o.siswaId || `SISWA-${idx + 1}`),
      NISN: formatTextSafe(o.NISN || o.nisn),
      NIK: formatTextSafe(o.NIK || o.nik),
      NoHP: formatTextSafe(o.NoHP || o.noHp || o.phone)
    }));
  } else {
    dataMap['ORANG_TUA'] = students.map((s: any, idx: number) => ({
      OrtuID: `ORTU-${s.id || idx + 1}`,
      SiswaID: formatTextSafe(s.id || s.nis || s.nisn || `SISWA-${idx + 1}`),
      NamaSiswa: s.name || '-',
      NISN: formatTextSafe(s.nisn || s.NISN),
      Hubungan: s.hubunganWali || 'Orang Tua Kandung',
      Nama: s.parentName || s.namaAyah || s.namaIbu || s.namaWali || 'Orang Tua Siswa',
      NIK: formatTextSafe(s.nikAyah || s.nikIbu || s.nik || '-'),
      TempatLahir: s.tempatLahirAyah || s.tempatLahirIbu || '-',
      TanggalLahir: s.tanggalLahirAyah || s.tanggalLahirIbu || '-',
      Pendidikan: s.pendidikanAyah || s.pendidikanIbu || '-',
      Pekerjaan: s.pekerjaanAyah || s.pekerjaanIbu || s.pekerjaanWali || '-',
      Penghasilan: s.penghasilanAyah || s.penghasilanIbu || '-',
      NoHP: formatTextSafe(s.tlpAyah || s.tlpIbu || s.tlpWali || s.noHp || s.parentPhone || '-'),
      Alamat: s.address || '-',
      StatusHidup: s.statusAyah || s.statusIbu || 'Masih Hidup',
      CreatedAt: s.createdAt || new Date().toISOString(),
      UpdatedAt: s.updatedAt || new Date().toISOString()
    }));
  }

  // 3. AKADEMIK & KURIKULUM
  const dbClasses = db.get('rombel');
  dataMap['KELAS'] = dbClasses.length > 0 ? dbClasses : (db.get('academic_classes').length > 0 ? db.get('academic_classes') : SEED_CLASSES);

  const dbJenjang = db.get('jenjang');
  dataMap['JENJANG'] = dbJenjang.length > 0 ? dbJenjang : (db.get('academic_jenjang').length > 0 ? db.get('academic_jenjang') : []);

  const dbMapel = db.get('mapel');
  dataMap['MAPEL'] = dbMapel.length > 0 ? dbMapel : (db.get('academic_subjects').length > 0 ? db.get('academic_subjects') : SEED_MAPEL);

  const dbTA = db.get('tahun_ajaran');
  const rawTA = dbTA.length > 0 ? dbTA : (db.get('academic_years').length > 0 ? db.get('academic_years') : []);
  dataMap['TAHUN_AJARAN'] = (rawTA || []).map((t: any, idx: number) => {
    const taId = t.TAID || t.taId || t.id || `TA-${idx + 1}`;
    const nama = t.Nama || t.nama || t.tahun || t.tahunPelajaran || t.tahunAjaran || '';
    const tm = t.TahunMulai || t.tahunMulai || (nama.includes('/') ? nama.split('/')[0] : '');
    const ts = t.TahunSelesai || t.tahunSelesai || (nama.includes('/') ? nama.split('/')[1] : '');
    const tglMulai = t.TanggalMulai || t.tanggalMulai || '';
    const tglSelesai = t.TanggalSelesai || t.tanggalSelesai || '';
    const isAktif = (t.Aktif || t.aktif || '').toUpperCase() === 'YA' || t.status === 'Aktif' || t.isActive === true;

    return {
      TAID: taId,
      Nama: nama,
      TahunMulai: tm,
      TahunSelesai: ts,
      TanggalMulai: tglMulai,
      TanggalSelesai: tglSelesai,
      Aktif: isAktif ? 'YA' : 'TIDAK',
      id: taId,
      taId: taId,
      nama: nama,
      tahun: nama,
      tahunPelajaran: nama,
      tahunMulai: tm,
      tahunSelesai: ts,
      tanggalMulai: tglMulai,
      tanggalSelesai: tglSelesai,
      aktif: isAktif ? 'YA' : 'TIDAK',
      status: isAktif ? 'Aktif' : 'Non-Aktif'
    };
  });

  const dbSem = db.get('semester');
  const rawSem = dbSem.length > 0 ? dbSem : (db.get('academic_semesters').length > 0 ? db.get('academic_semesters') : []);
  dataMap['SEMESTER'] = (rawSem || []).map((s: any, idx: number) => {
    const tp = (s.TahunPelajaran || s.tahunPelajaran || s.tahunAjaran || s.tahun || '2026/2027').trim();
    const semType = normalizeSemesterType(s);
    const sid = s.SemesterID || s.semesterId || s.id || `SEM-${tp.split('/')[0] || '2026'}-${semType === 'Ganjil' ? '1' : '2'}`;
    const taId = s.TahunAjaranID || s.tahunAjaranId || s.taId || '';
    const semName = semType;
    const nama = s.Nama || s.nama || `${tp} ${semName}`;
    const tglMulai = s.TanggalMulai || s.tanggalMulai || s.startDate || '';
    const tglSelesai = s.TanggalSelesai || s.tanggalSelesai || s.endDate || '';
    const isAktif = (s.Aktif || s.aktif || '').toUpperCase() === 'YA' || s.status === 'Aktif' || s.isActive === true;

    return {
      SemesterID: sid,
      Nama: nama,
      TahunAjaranID: taId,
      TahunPelajaran: tp,
      Semester: semName,
      TanggalMulai: tglMulai,
      TanggalSelesai: tglSelesai,
      Aktif: isAktif ? 'YA' : 'TIDAK',
      id: sid,
      semesterId: sid,
      nama: nama,
      taId: taId,
      tahunAjaranId: taId,
      tahunPelajaran: tp,
      semester: semName,
      tanggalMulai: tglMulai,
      tanggalSelesai: tglSelesai,
      aktif: isAktif ? 'YA' : 'TIDAK',
      status: isAktif ? 'Aktif' : 'Non-Aktif',
      isActive: isAktif,
      tipe: semName === 'Genap' ? 'EVEN' : 'ODD'
    };
  });

  const rawLibur = db.get('hari_libur');
  const liburSource = rawLibur.length > 0 ? rawLibur : (db.get('academic_holidays').length > 0 ? db.get('academic_holidays') : []);
  dataMap['HARI_LIBUR'] = (liburSource || []).map((l: any, idx: number) => {
    const hId = l.hariLiburId || l.HariLiburID || l.id || `H${idx + 1}`;
    const tglMulai = l.tanggal || l.Tanggal || l.tanggalMulai || l.tgl || '';
    const tglSelesai = l.tanggalSelesai || l.TanggalSelesai || l.tglSelesai || tglMulai;
    const namaLibur = l.nama || l.Nama || l.agenda || l.Agenda || l.kegiatan || '';
    const jenisLibur = l.jenis || l.Jenis || l.kategori || 'Libur Nasional / Libur Umum';
    const ta = l.tahunAjaran || l.TahunAjaran || l.tahun || '2026/2027';
    const ket = l.keterangan !== undefined ? l.keterangan : (l.Keterangan !== undefined ? l.Keterangan : '');
    const hari = l.hari || '';

    return {
      HariLiburID: hId,
      Tanggal: tglMulai,
      TanggalSelesai: tglSelesai,
      Nama: namaLibur,
      Jenis: jenisLibur,
      TahunAjaran: ta,
      Keterangan: ket,
      id: hId,
      hariLiburId: hId,
      liburId: hId,
      liburid: hId,
      tanggal: tglMulai,
      tgl: tglMulai,
      tanggalMulai: tglMulai,
      tanggalSelesai: tglSelesai,
      tglSelesai: tglSelesai,
      nama: namaLibur,
      agenda: namaLibur,
      jenis: jenisLibur,
      kategori: jenisLibur,
      tahunAjaran: ta,
      tahun: ta,
      keterangan: ket,
      hari: hari
    };
  });

  const rawSchedules = (db.get('academic_schedules') || db.get('jadwal_rombel') || db.get('jadwal_pelajaran') || db.get('jadwal') || []) as any[];
  let validSchedules = Array.isArray(rawSchedules)
    ? rawSchedules.filter((j: any) => j && !String(j.id || '').startsWith('jdw-init-'))
    : [];
  if (!validSchedules || validSchedules.length === 0) {
    validSchedules = generateJadwalItemsFromMaster(currentSettings.tahunPelajaran || '2026/2027', currentSettings.semester || 'Ganjil');
  }
  // Standardize headers for Google Spreadsheet JADWAL sheet
  dataMap['JADWAL'] = validSchedules.map((j: any, idx: number) => ({
    JadwalID: j.JadwalID || j.id || `JDW-${String(idx + 1).padStart(3, '0')}`,
    Hari: j.Hari || j.hari || 'Senin',
    JamMulai: j.JamMulai || j.jamMulai || '13:00',
    JamSelesai: j.JamSelesai || j.jamSelesai || '15:00',
    KelasID: j.KelasID || j.kelas || j.NamaKelas || '4',
    NamaKelas: j.NamaKelas || j.kelas || 'Kelas 4',
    MapelID: j.MapelID || j.kodeMapel || j.mapel || 'MAPEL',
    NamaMapel: j.NamaMapel || j.mataPelajaran || j.mapel || 'Mata Pelajaran',
    GuruID: j.GuruID || j.guruId || 'GURU',
    NamaGuru: j.NamaGuru || j.guru || 'Tutor Pengampu',
    Ruangan: j.Ruangan || j.ruang || 'Ruang KBM',
    TAID: j.TAID || j.tahunAjaran || currentSettings.tahunPelajaran || '2026/2027',
    SemesterID: j.SemesterID || j.semester || currentSettings.semester || 'Ganjil',
    Status: j.Status || j.status || 'Aktif',
    KategoriBelajar: j.KategoriBelajar || j.kategoriBelajar || 'Semua',
    MateriPokok: j.MateriPokok || j.materiPokok || '-',
    KodeModul: j.KodeModul || j.kodeModul || '-',
    TemaModul: j.TemaModul || j.temaModul || '-',
    CreatedAt: j.CreatedAt || j.createdAt || new Date().toISOString(),
    UpdatedAt: j.UpdatedAt || j.updatedAt || new Date().toISOString()
  }));

  const rawAgendas = db.get('academic_agendas');
  const sourceAgendas = rawAgendas.length > 0 ? rawAgendas : (db.get('agenda') || []);
  dataMap['AGENDA'] = (Array.isArray(sourceAgendas) ? sourceAgendas : []).map((a: any, idx: number) => ({
    AgendaID: formatTextSafe(a.AgendaID || a.id || `AGD-${String(idx + 1).padStart(4, '0')}`),
    Tanggal: formatTextSafe(a.Tanggal || a.tanggal || new Date().toISOString().slice(0, 10)),
    GuruID: formatTextSafe(a.GuruID || a.guruId || 'GUR-001'),
    NamaGuru: a.NamaGuru || a.namaGuru || teachers[0]?.name || 'Tim Guru',
    MapelID: formatTextSafe(a.MapelID || a.mapelId || 'MP-001'),
    NamaMapel: a.NamaMapel || a.namaMapel || a.kategori || 'Umum',
    KelasID: formatTextSafe(a.KelasID || a.kelasId || 'KLS-001'),
    NamaKelas: a.NamaKelas || a.namaKelas || 'Semua Kelas',
    JamKe: formatTextSafe(a.JamKe || a.jamKe || '1-2'),
    MateriPokok: a.MateriPokok || a.materiPokok || a.judul || 'Agenda Kegiatan',
    KegiatanPembelajaran: a.KegiatanPembelajaran || a.kegiatanPembelajaran || a.keterangan || '-',
    KehadiranSiswa: a.KehadiranSiswa || a.kehadiranSiswa || 'Lengkap',
    Hambatan: a.Hambatan || a.hambatan || '-',
    TindakLanjut: a.TindakLanjut || a.tindakLanjut || '-',
    Status: a.Status || a.status || 'Selesai',
    CreatedAt: formatTextSafe(a.CreatedAt || a.createdAt || new Date().toISOString()),
    UpdatedAt: formatTextSafe(a.UpdatedAt || a.updatedAt || new Date().toISOString())
  }));

  // NILAI (Buku Induk Penilaian Terpadu: Memisahkan Penugasan KBM, Ujian Online CBT, dan Formatif/Sumatif)
  const allNilaiRows: any[] = [];
  const registeredNilaiKeys = new Set<string>();

  // 1. Nilai dari Input Guru Akademik & Kurikulum (Formatif TP1-4, STS, SAS)
  const rawGrades = db.get('academic_grades') || [];
  const gradesMap = (db.get('nilai_akademik_map') as any) || {};

  if (Array.isArray(rawGrades) && rawGrades.length > 0) {
    rawGrades.forEach((g: any, idx: number) => {
      const student = (students || []).find((s: any) => s.id === g.SiswaID || s.id === g.studentId || (g.NISN && s.nisn === g.NISN));
      const sId = g.SiswaID || g.studentId || (student ? student.id : `SIS-${idx + 1}`);
      const nisnVal = g.NISN || (student ? student.nisn : '-');
      const namaVal = g.NamaSiswa || (student ? student.name : `Siswa ${sId}`);
      const kelasVal = g.Kelas || (student ? student.class : '4A');
      const mapelVal = g.Mapel || g.mataPelajaran || 'Mata Pelajaran';
      const nAkhir = Number(g.NilaiAkhir || g.nilaiAkhir || g.NilaiAngka || 80);
      const kkmVal = Number(g.KKM || 75);
      const predikat = nAkhir >= 90 ? 'A' : nAkhir >= 80 ? 'B' : nAkhir >= 75 ? 'C' : 'D';
      const statusTuntas = nAkhir >= kkmVal ? 'Tuntas' : 'Perlu Bimbingan';
      const rowId = g.NilaiID || `NIL-GURU-${idx + 1}`;

      registeredNilaiKeys.add(`${sId}_${mapelVal}_GURU`);
      allNilaiRows.push({
        NilaiID: rowId,
        SiswaID: sId,
        NISN: nisnVal,
        NamaSiswa: namaVal,
        Kelas: kelasVal,
        Mapel: mapelVal,
        Guru: g.Guru || g.guru || 'Guru Mata Pelajaran',
        Semester: g.Semester || g.semester || 'Ganjil',
        TahunAjaran: g.TahunAjaran || g.tahunAjaran || '2026/2027',
        TipePenilaian: g.TipePenilaian || 'FORMATIF_DAN_SUMATIF',
        SumberNilai: g.SumberNilai || 'Buku Nilai Guru Akademik',
        JudulPenilaian: g.JudulPenilaian || 'Penilaian Capaian Pembelajaran & Modul KBM',
        NilaiAngka: nAkhir,
        NilaiFormatif_TP: g.NilaiFormatif_TP || g.tp1 || g.tp2 ? `${g.tp1 || ''} / ${g.tp2 || ''}` : `${nAkhir}`,
        NilaiUTS_STS: g.NilaiUTS_STS || g.sts || g.NilaiUTS || '',
        NilaiUAS_SAS: g.NilaiUAS_SAS || g.sas || g.NilaiUAS || '',
        NilaiAkhir: nAkhir,
        KKM: kkmVal,
        Predikat: g.Predikat || predikat,
        CapaianKompetensi: g.CapaianKompetensi || g.ketercapaian || (nAkhir >= kkmVal ? 'Tercapai dengan sangat baik' : 'Perlu pendampingan belajar'),
        StatusTuntas: g.StatusTuntas || statusTuntas,
        Keterangan: g.Keterangan || g.Catatan || 'Nilai Buku Akademik Guru (Formatif TP & Sumatif)',
        TanggalPenilaian: g.TanggalPenilaian || g.TanggalInput || nowDateStr,
        CreatedAt: g.CreatedAt || new Date().toISOString(),
        UpdatedAt: g.UpdatedAt || new Date().toISOString()
      });
    });
  }

  if (Object.keys(gradesMap).length > 0) {
    Object.entries(gradesMap).forEach(([key, g]: [string, any], idx: number) => {
      const studentId = g.studentId || key.split('_')[0];
      const semester = g.semester || key.split('_')[1] || 'Ganjil';
      const mapel = g.mataPelajaran || key.split('_')[2] || 'Mata Pelajaran';
      const student = (students || []).find((s: any) => s.id === studentId || (s.name && s.name.toLowerCase() === (g.studentName || '').toLowerCase()));
      const nAkhir = Number(g.nilaiAkhir || (g.tp1 && g.sts ? Math.round((Number(g.tp1 || 80) + Number(g.sts || 80)) / 2) : 80));
      const kkmVal = 75;
      const predikat = nAkhir >= 90 ? 'A' : nAkhir >= 80 ? 'B' : nAkhir >= 75 ? 'C' : 'D';
      const statusTuntas = nAkhir >= kkmVal ? 'Tuntas' : 'Perlu Bimbingan';
      const rowKey = `${studentId}_${mapel}_MAP`;

      if (!registeredNilaiKeys.has(rowKey)) {
        registeredNilaiKeys.add(rowKey);
        allNilaiRows.push({
          NilaiID: `NIL-MAP-${idx + 1}`,
          SiswaID: studentId,
          NISN: student ? student.nisn : '-',
          NamaSiswa: student ? student.name : (g.studentName || `Siswa ${studentId}`),
          Kelas: student ? student.class : '4A',
          Mapel: mapel,
          Guru: g.guru || 'Guru Pengampu',
          Semester: semester,
          TahunAjaran: g.tahunAjaran || '2026/2027',
          TipePenilaian: 'FORMATIF_DAN_SUMATIF',
          SumberNilai: 'Buku Nilai Guru Akademik',
          JudulPenilaian: `Input Nilai Mapel ${mapel} Semester ${semester}`,
          NilaiAngka: nAkhir,
          NilaiFormatif_TP: `TP1:${g.tp1 ?? '-'} TP2:${g.tp2 ?? '-'} TP3:${g.tp3 ?? '-'} TP4:${g.tp4 ?? '-'}`,
          NilaiUTS_STS: g.sts ?? '',
          NilaiUAS_SAS: g.sas ?? '',
          NilaiAkhir: nAkhir,
          KKM: kkmVal,
          Predikat: predikat,
          CapaianKompetensi: g.ketercapaian || (nAkhir >= kkmVal ? 'Menunjukkan penguasaan kompetensi dengan baik' : 'Memerlukan latihan tambahan'),
          StatusTuntas: statusTuntas,
          Keterangan: 'Nilai Input Formatif & Sumatif Modul Guru Akademik',
          TanggalPenilaian: nowDateStr,
          CreatedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString()
        });
      }
    });
  }

  // 2. Nilai Otomatis dari Modul Penugasan Siswa (KBM / Silabus)
  const rawTugasSubmissions = (db.get('hasil_tugas_kbm') as any[]) || (db.get('assignment_submissions') as any[]) || [];
  rawTugasSubmissions.forEach((t: any, idx: number) => {
    const student = (students || []).find((s: any) => s.id === t.studentId || s.id === t.SiswaID || (t.nisn && s.nisn === t.nisn) || (t.nama && s.name && s.name.toLowerCase() === t.nama.toLowerCase()));
    const sId = t.studentId || t.SiswaID || (student ? student.id : `SIS-${idx + 1}`);
    const skor = Number(t.nilai ?? t.score ?? t.Nilai ?? 85);
    const kkmVal = 75;
    const judulTugas = t.judulTugas || t.topik || t.namaTugas || `Penugasan Modul ${t.mapel || 'KBM'}`;
    const mapel = t.mapel || t.Mapel || 'Mata Pelajaran';
    const predikat = skor >= 90 ? 'A' : skor >= 80 ? 'B' : skor >= 75 ? 'C' : 'D';

    allNilaiRows.push({
      NilaiID: t.id || t.submissionId || `NIL-TGS-${idx + 1}`,
      SiswaID: sId,
      NISN: student ? student.nisn : (t.nisn || '-'),
      NamaSiswa: student ? student.name : (t.nama || t.studentName || `Siswa ${sId}`),
      Kelas: student ? student.class : (t.kelas || '4A'),
      Mapel: mapel,
      Guru: t.guru || 'Guru Pembimbing',
      Semester: t.semester || 'Ganjil',
      TahunAjaran: t.tahunAjaran || '2026/2027',
      TipePenilaian: 'PENUGASAN',
      SumberNilai: 'Modul Penugasan Siswa',
      JudulPenilaian: judulTugas,
      NilaiAngka: skor,
      NilaiFormatif_TP: String(skor),
      NilaiUTS_STS: '',
      NilaiUAS_SAS: '',
      NilaiAkhir: skor,
      KKM: kkmVal,
      Predikat: predikat,
      CapaianKompetensi: t.feedback || (skor >= kkmVal ? 'Tugas terselesaikan dengan tuntas' : 'Perlu perbaikan tugas modul'),
      StatusTuntas: skor >= kkmVal ? 'Tuntas' : 'Remedial Tugas',
      Keterangan: `Nilai Otomatis Penugasan Modul: ${judulTugas}`,
      TanggalPenilaian: t.submittedAt ? t.submittedAt.slice(0, 10) : nowDateStr,
      CreatedAt: t.createdAt || new Date().toISOString(),
      UpdatedAt: t.updatedAt || new Date().toISOString()
    });
  });

  // 3. Nilai Otomatis dari Ujian Online CBT
  const rawCbtResults = (db.get('cbt_exam_results') as any[]) || (db.get('cbt_hasil_siswa') as any[]) || (db.get('cbt_results') as any[]) || [];
  rawCbtResults.forEach((c: any, idx: number) => {
    const student = (students || []).find((s: any) => s.id === c.studentId || s.id === c.SiswaID || (c.nisn && s.nisn === c.nisn) || (c.nama && s.name && s.name.toLowerCase() === c.nama.toLowerCase()));
    const sId = c.studentId || c.SiswaID || (student ? student.id : `SIS-${idx + 1}`);
    const skor = Number(c.nilaiAkhir ?? c.nilai ?? c.score ?? 80);
    const kkmVal = 75;
    const namaUjian = c.namaUjian || c.nama || c.ujianName || `Ujian CBT ${c.mapel || 'Online'}`;
    const mapel = c.mapel || c.Mapel || 'Mata Pelajaran';
    const predikat = skor >= 90 ? 'A' : skor >= 80 ? 'B' : skor >= 75 ? 'C' : 'D';

    allNilaiRows.push({
      NilaiID: c.id || c.resultId || `NIL-CBT-${idx + 1}`,
      SiswaID: sId,
      NISN: student ? student.nisn : (c.nisn || '-'),
      NamaSiswa: student ? student.name : (c.nama || c.studentName || `Siswa ${sId}`),
      Kelas: student ? student.class : (c.kelas || '4A'),
      Mapel: mapel,
      Guru: c.proktor || c.guru || 'Proktor CBT',
      Semester: c.semester || 'Ganjil',
      TahunAjaran: c.tahunAjaran || '2026/2027',
      TipePenilaian: 'UJIAN_CBT',
      SumberNilai: 'Ujian CBT Online',
      JudulPenilaian: namaUjian,
      NilaiAngka: skor,
      NilaiFormatif_TP: '',
      NilaiUTS_STS: String(skor),
      NilaiUAS_SAS: '',
      NilaiAkhir: skor,
      KKM: kkmVal,
      Predikat: predikat,
      CapaianKompetensi: `Hasil Ujian CBT (Benar: ${c.benar ?? '-'}, Salah: ${c.salah ?? '-'}, Pelanggaran: ${c.pelanggaran ?? 0})`,
      StatusTuntas: skor >= kkmVal ? 'Tuntas' : 'Remedial Ujian',
      Keterangan: `Nilai Otomatis Hasil Ujian CBT: ${namaUjian}`,
      TanggalPenilaian: c.tanggal || (c.selesaiPada ? c.selesaiPada.slice(0, 10) : nowDateStr),
      CreatedAt: c.createdAt || new Date().toISOString(),
      UpdatedAt: c.updatedAt || new Date().toISOString()
    });
  });

  dataMap['NILAI'] = allNilaiRows;

  const rawReports = db.get('academic_reports');
  dataMap['RAPOR'] = rawReports.length > 0 ? rawReports : db.get('rapor');

  const rawPromotions = db.get('academic_promotions');
  dataMap['KENAIKAN_KELAS'] = rawPromotions.length > 0 ? rawPromotions : db.get('kenaikan_kelas');
  dataMap['KELULUSAN'] = db.get('academic_graduations');

  // 4. PRESENSI, PERIZINAN & QR CODE
  const rawAbsensi = db.get('absensi');
  const rawAttendances = db.get('attendances');
  const sourceAbsensi = rawAbsensi.length > 0 ? rawAbsensi : rawAttendances;
  
  // Format exact official headers: AbsenID, Tanggal, SiswaID, NISN, NamaSiswa, KelasID, NamaKelas, JamMasuk, JamPulang, Status, Keterangan, Lokasi, Latitude, Longitude, QRCode, PetugasID, CreatedAt, UpdatedAt
  dataMap['ABSENSI'] = (sourceAbsensi || []).map((a: any, idx: number) => {
    const student = (students || []).find((s: any) => s.id === a.studentId || (a.nisn && s.nisn === a.nisn) || (s.name && a.name && s.name.toLowerCase() === a.name.toLowerCase()));
    const timeVal = a.time || a.JamMasuk || a.jamMasuk || a.jam || '07:30';
    const statusVal = a.status || a.Status || 'H';
    let statusFormatted = 'Hadir';
    if (statusVal === 'H' || statusVal === 'Hadir') statusFormatted = 'Hadir';
    else if (statusVal === 'S' || statusVal === 'Sakit') statusFormatted = 'Sakit';
    else if (statusVal === 'I' || statusVal === 'Izin') statusFormatted = 'Izin';
    else if (statusVal === 'A' || statusVal === 'Alpa') statusFormatted = 'Alpa';
    else if (statusVal === 'T' || statusVal === 'Terlambat') statusFormatted = 'Terlambat';

    return {
      AbsenID: a.AbsenID || a.absenId || a.id || `ABS-${Date.now()}-${idx + 1}`,
      Tanggal: a.Tanggal || a.tanggal || a.date || nowDateStr,
      SiswaID: a.SiswaID || a.siswaId || a.studentId || (student ? student.id : `SISWA-${idx + 1}`),
      NISN: formatTextSafe(a.NISN || a.nisn || (student ? student.nisn : '-')),
      NamaSiswa: a.NamaSiswa || a.namaSiswa || a.name || (student ? student.name : 'Siswa'),
      KelasID: a.KelasID || a.kelasId || a.classId || a.class || (student ? student.class : '1A'),
      NamaKelas: a.NamaKelas || a.namaKelas || (a.class ? `Kelas ${a.class}` : (student ? `Kelas ${student.class}` : 'Kelas 1A')),
      JamMasuk: a.JamMasuk || a.jamMasuk || (a.type === 'Pulang' ? '' : timeVal),
      JamPulang: a.JamPulang || a.jamPulang || (a.type === 'Pulang' ? timeVal : ''),
      Status: statusFormatted,
      Keterangan: a.Keterangan || a.keterangan || a.note || a.catatan || (a.method ? `Via ${a.method}` : '-'),
      Lokasi: a.Lokasi || a.lokasi || 'Sekolah / PKBM Tambora',
      Latitude: a.Latitude || a.latitude || '',
      Longitude: a.Longitude || a.longitude || '',
      QRCode: a.QRCode || a.qrCode || (a.nisn ? `QR-${a.nisn}` : (student ? `QR-${student.nisn || student.id}` : '')),
      PetugasID: a.PetugasID || a.petugasId || a.recordedBy || 'Admin / Wali Kelas',
      CreatedAt: a.CreatedAt || a.createdAt || nowIso,
      UpdatedAt: a.UpdatedAt || a.updatedAt || nowIso
    };
  });

  const rawAbsensiGuru = db.get('absensi_guru');
  const rawTeacherAttendances = db.get('teacher_attendances');
  dataMap['ABSENSI_GURU'] = rawAbsensiGuru.length > 0 ? rawAbsensiGuru : rawTeacherAttendances;

  const rawPerizinan = db.get('perizinan_siswa');
  dataMap['PERIZINAN'] = rawPerizinan.length > 0 ? rawPerizinan : db.get('perizinan');

  const rawQrLogs = db.get('recent_qr_scans');
  dataMap['QR_LOG'] = rawQrLogs.length > 0 ? rawQrLogs : db.get('qr_logs');

  // REKAP_PRESENSI (Agregasi Otomatis Kehadiran Bulanan Siswa per Kelas)
  // Headers: RekapID, PeriodeBulan, TahunAjaran, Semester, Kelas, SiswaID, NISN, NamaSiswa, Hadir, Izin, Sakit, Alpa, Terlambat, PersentaseHadir
  const activeTaObj = (dataMap['TAHUN_AJARAN'] || []).find((t: any) => t.Aktif === 'YA' || t.aktif === 'YA' || t.status === 'Aktif' || t.isActive);
  const activeTaStr = String(activeTaObj?.Nama || activeTaObj?.nama || currentSettings?.tahunPelajaran || db.get('active_tahun_ajaran') || '2026/2027');

  const activeSemObj = (dataMap['SEMESTER'] || []).find((s: any) => s.Aktif === 'YA' || s.aktif === 'YA' || s.status === 'Aktif' || s.isActive);
  const activeSemStr = activeSemObj ? normalizeSemesterType(activeSemObj) : String(currentSettings?.semester || currentSettings?.activeSemester || db.get('active_semester') || 'Ganjil');

  const currentMonthYear = nowDateStr.substring(0, 7);

  const rekapMap = new Map<string, {
    siswaId: string;
    nisn: string;
    nama: string;
    kelas: string;
    bulan: string;
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    terlambat: number;
  }>();

  // 4. REKAP_PRESENSI (Berdasarkan log aktual atau rekaman yang tersimpan)
  const absensiRecords = dataMap['ABSENSI'] || [];
  const generatedRekapList: any[] = [];

  if (absensiRecords.length > 0) {
    absensiRecords.forEach((ab: any) => {
      const sId = String(ab.SiswaID || ab.siswaId || '-');
      const tgl = String(ab.Tanggal || nowDateStr);
      const bulan = tgl.length >= 7 ? tgl.substring(0, 7) : currentMonthYear;
      const key = `${sId}_${bulan}`;

      if (!rekapMap.has(key)) {
        rekapMap.set(key, {
          siswaId: sId,
          nisn: formatTextSafe(ab.NISN || ab.nisn),
          nama: ab.NamaSiswa || 'Siswa',
          kelas: ab.KelasID || ab.NamaKelas || '1A',
          bulan: bulan,
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpa: 0,
          terlambat: 0
        });
      }

      const rec = rekapMap.get(key)!;
      const st = String(ab.Status || '').toLowerCase();
      if (st.includes('hadir') || st === 'h') rec.hadir++;
      else if (st.includes('izin') || st === 'i') rec.izin++;
      else if (st.includes('sakit') || st === 's') rec.sakit++;
      else if (st.includes('alpa') || st === 'a') rec.alpa++;
      else if (st.includes('terlambat') || st === 't') rec.terlambat++;
    });

    rekapMap.forEach((v) => {
      const totalHari = v.hadir + v.izin + v.sakit + v.alpa + v.terlambat;
      const persentase = totalHari > 0 ? Math.round(((v.hadir + v.terlambat) / totalHari) * 100) : 100;
      generatedRekapList.push({
        RekapID: `RKP-${v.bulan.replace('-', '')}-${v.siswaId}`,
        PeriodeBulan: v.bulan,
        TahunAjaran: activeTaStr,
        Semester: activeSemStr,
        Kelas: v.kelas,
        SiswaID: v.siswaId,
        NISN: v.nisn,
        NamaSiswa: v.nama,
        Hadir: v.hadir,
        Izin: v.izin,
        Sakit: v.sakit,
        Alpa: v.alpa,
        Terlambat: v.terlambat,
        PersentaseHadir: `${persentase}%`
      });
    });
  }

  const rawSavedRekap = db.get('rekap_presensi');
  const finalRekapList = generatedRekapList.length > 0 ? generatedRekapList : (Array.isArray(rawSavedRekap) && rawSavedRekap.length > 0 ? rawSavedRekap : []);
  dataMap['REKAP_PRESENSI'] = finalRekapList;
  if (finalRekapList.length > 0) {
    db.set('rekap_presensi', finalRekapList, { skipPush: true });
  }

  // 5. CBT & UJIAN ONLINE (Murni non-dummy)
  const rawBankSoal = db.get('cbt_bank_soal');
  let bankSoalList = (rawBankSoal && rawBankSoal.length > 0) ? rawBankSoal : (db.get('cbt_questions') || []);
  if (!Array.isArray(bankSoalList)) bankSoalList = [];
  
  // Buang paket dummy otomatis
  bankSoalList = bankSoalList.filter((b: any) => !isDummyBankSoalPackage(b));

  dataMap['BANK_SOAL'] = (bankSoalList || []).map((b: any, idx: number) => {
    const rawK = String(b.Kelas || b.kelas || '4');
    const cleanK = rawK.replace(/[A-Za-z]/g, '').trim() || '4';
    const rawSoalList = Array.isArray(b.soalList) ? b.soalList : [];
    const validSoalList = rawSoalList.filter((s: any) => !isDummyQuestion(s));

    const rawJenis = b.JenisAsesmen || b.jenisAsesmen || b.JenisUjian || b.jenisUjian || '';
    let resolvedJenis = rawJenis;
    if (!resolvedJenis || resolvedJenis === 'Sumatif Tengah Semester (STS)') {
      const bId = String(b.BankSoalID || b.id || '').toUpperCase();
      const bTopik = String(b.Topik || b.topik || '').toLowerCase();
      if (bId.includes('2210') || bId.includes('HARIAN') || bTopik.includes('harian') || b.silabusNo || b.SilabusNo) {
        resolvedJenis = 'Sumatif Harian';
      } else if (bId.includes('SAS')) {
        resolvedJenis = 'Sumatif Akhir Semester (SAS)';
      } else if (bId.includes('PAT') || bId.includes('SAT')) {
        resolvedJenis = 'Penilaian Akhir Tahun (PAT / SAT)';
      } else if (rawJenis) {
        resolvedJenis = rawJenis;
      } else {
        resolvedJenis = 'Sumatif Harian';
      }
    }

    const resolvedDurasi = Number(b.Durasi || b.durasi || b.durasiMenit || b.DurasiMenit) || 60;

    return {
      BankSoalID: b.BankSoalID || b.id || `BNK-${idx + 1}`,
      Mapel: b.Mapel || b.mapel || 'Mata Pelajaran',
      Kelas: cleanK,
      Kurikulum: b.Kurikulum || b.kurikulum || 'Kurikulum Merdeka',
      JenisAsesmen: resolvedJenis,
      Durasi: resolvedDurasi,
      Guru: b.Guru || b.guru || 'Guru Pengampu',
      Topik: b.Topik || b.topik || b.Bab || b.bab || b.SubBab || b.subBab || b.temaModul || '',
      KodeSubTugas: b.KodeSubTugas || b.kodeSubTugas || b.singkatanDanJudul || '',
      SilabusNo: b.SilabusNo !== undefined ? b.SilabusNo : (b.silabusNo !== undefined ? b.silabusNo : (b.no !== undefined ? b.no : '')),
      Bab: b.Bab || b.bab || b.temaModul || '',
      SubBab: b.SubBab || b.subBab || b.topikSubTugas || b.topik || '',
      JumlahSoal: validSoalList.length || (Number(b.JumlahSoal || b.jumlahSoal) || 0),
      TipeSoal: b.TipeSoal || b.tipeSoal || 'Pilihan Ganda',
      Kesulitan: b.Kesulitan || b.kesulitan || 'Sedang (50%)',
      Status: b.Status || b.status || 'Siap Digunakan',
      SoalJSON: JSON.stringify(validSoalList),
      CreatedAt: b.CreatedAt || b.createdAt || b.updatedAt || new Date().toISOString(),
      UpdatedAt: b.UpdatedAt || b.updatedAt || new Date().toISOString()
    };
  });

  const rawUjian = db.get('ujian_cbt');
  let ujianList = rawUjian && rawUjian.length > 0 ? rawUjian : (db.get('cbt_exams') || db.get('cbt_schedules') || []);
  if (!ujianList || ujianList.length === 0) {
    ujianList = JADWAL_STS_GANJIL_2026;
  }
  // Hapus permanen jadwal dummy 01 Oktober 2026
  ujianList = (ujianList || []).filter((u: any) => {
    const t = String(u.Tanggal || u.tgl || u.tanggal || u.tglDisplay || '');
    return !t.includes('10-01') && !t.includes('01 Okt') && !t.includes('2026-10-01');
  });
  dataMap['UJIAN'] = ujianList.map((u: any, idx: number) => {
    const rawK = String(u.Kelas || u.kelas || '4').trim();
    const bankId = u.BankSoalID || u.bankSoalId || '';
    return {
      UjianID: u.UjianID || u.id || `UJN-${idx + 1}`,
      BankSoalID: bankId,
      NamaUjian: u.NamaUjian || u.namaUjian || u.nama || u.mapel || 'Ujian CBT',
      Mapel: u.Mapel || u.mapel || 'Mata Pelajaran',
      Kelas: rawK,
      JenisUjian: u.JenisUjian || u.jenis || u.jenisUjian || 'Sumatif',
      Tanggal: u.Tanggal || u.tgl || u.tanggal || nowDateStr,
      JamMulai: u.JamMulai || u.jamMulai || '07:30',
      JamSelesai: u.JamSelesai || u.jamSelesai || '09:00',
      Durasi: u.Durasi || u.durasi || '90 Menit',
      Peserta: u.Peserta || u.peserta || 0,
      Proktor: u.Proktor || u.proktor || u.pengawas || 'Proktor Sekolah',
      JumlahSoal: u.JumlahSoal || u.jumlahSoal || (u.soal ? String(u.soal) : '20 Soal'),
      AcakSoal: u.AcakSoal !== undefined ? String(u.AcakSoal) : (u.acakSoal ? 'YA' : 'TIDAK'),
      AcakOpsi: u.AcakOpsi !== undefined ? String(u.AcakOpsi) : (u.acakOpsi ? 'YA' : 'TIDAK'),
      TampilkanNilai: u.TampilkanNilai !== undefined ? String(u.TampilkanNilai) : (u.tampilkanNilai ? 'YA' : 'TIDAK'),
      Token: u.Token || u.token || 'CBT999',
      Status: u.Status || u.status || 'Terjadwal',
      NilaiRataRata: u.NilaiRataRata || u.avg || 0,
      CreatedAt: u.CreatedAt || u.createdAt || new Date().toISOString(),
      UpdatedAt: u.UpdatedAt || u.updatedAt || new Date().toISOString()
    };
  });

  const rawTokens = db.get('cbt_token_history');
  let tokenList = rawTokens && rawTokens.length > 0 ? rawTokens : (db.get('cbt_tokens') || []);
  if (!tokenList || tokenList.length === 0) {
    tokenList = (ujianList || []).map((item: any) => ({
      id: `tok-${item.id || item.UjianID}`,
      sesiId: item.id || item.UjianID,
      mapel: item.mapel || item.Mapel,
      kelas: item.kelas || item.Kelas,
      token: item.token || item.Token || 'CBT001',
      status: 'Aktif'
    }));
  }
  dataMap['TOKEN'] = tokenList.map((t: any, idx: number) => ({
    TokenID: t.TokenID || t.id || `TKN-${idx + 1}`,
    UjianID: t.UjianID || t.ujianId || t.sesiId || t.idUjian || '-',
    NamaUjian: t.NamaUjian || t.namaUjian || t.mapel || 'Sesi Ujian Aktif',
    Kelas: t.Kelas || t.kelas || 'Semua Kelas',
    Token: t.Token || t.token || 'CBT001',
    Tanggal: t.Tanggal || t.tanggal || nowDateStr,
    JamMulai: t.JamMulai || t.jamMulai || '07:30',
    JamSelesai: t.JamSelesai || t.jamSelesai || '16:00',
    DurasiMenit: t.DurasiMenit || t.durasi || 90,
    Status: t.Status || t.status || 'Aktif',
    CreatedAt: t.CreatedAt || t.createdAt || new Date().toISOString()
  }));

  // Alias untuk kompatibilitas nama sheet ganda pada spreadsheet pengguna
  dataMap['CBT_UJIAN'] = dataMap['UJIAN'];
  dataMap['CBT_TOKEN'] = dataMap['TOKEN'];
  dataMap['JADWAL_UJIAN'] = (db.get('cbt_schedules') as any[]) || dataMap['UJIAN'];

  // SOAL (Ekstraksi butir soal murni non-dummy dari Bank Soal atau tabel soal tersendiri)
  const rawSoal = (db.get('cbt_exam_questions') as any[]) || (db.get('soal') as any[]) || [];
  const soalMap = new Map<string, any>();

  // 1. Ambil dari butir soal bank_soal (hanya butir soal asli non-dummy)
  if (Array.isArray(bankSoalList) && bankSoalList.length > 0) {
    bankSoalList.forEach((bnk: any, bIdx: number) => {
      const bankId = bnk.id || bnk.BankSoalID || `BNK-${bIdx + 1}`;
      let soalList: any[] = [];

      if (Array.isArray(bnk.soalList) && bnk.soalList.length > 0) {
        soalList = bnk.soalList;
      } else if (bnk.SoalJSON && typeof bnk.SoalJSON === 'string') {
        try {
          soalList = JSON.parse(bnk.SoalJSON);
        } catch {
          soalList = [];
        }
      }

      // Buang soal dummy
      soalList = soalList.filter(s => !isDummyQuestion(s));

      soalList.forEach((s: any, sIdx: number) => {
        const nomor = Number(s.id || s.NomorSoal || s.nomor || sIdx + 1);
        const dedupeKey = `${bankId}-${nomor}`;
        const canonicalId = `SOAL-${bankId}-${nomor}`;

        const mapelName = bnk.mapel || bnk.Mapel || s.mapel || s.Mapel || 'Mata Pelajaran';
        const kelasName = String(bnk.kelas || bnk.Kelas || s.kelas || s.Kelas || '4').replace(/[A-Za-z]/g, '').trim() || '4';
        const jenjangName = bnk.jenjang || bnk.Jenjang || s.jenjang || (Number(kelasName) <= 6 ? 'Paket A' : Number(kelasName) <= 9 ? 'Paket B' : 'Paket C');

        soalMap.set(dedupeKey, {
          DetailSoalID: canonicalId,
          UjianID: bnk.ujianId || bankId,
          BankSoalID: bankId,
          MataPelajaran: mapelName,
          'Mata Pelajaran': mapelName,
          Mapel: mapelName,
          Kelas: kelasName,
          kelas: kelasName,
          Jenjang: jenjangName,
          jenjang: jenjangName,
          Nomor: nomor,
          NomorSoal: nomor,
          Pertanyaan: s.pertanyaan || s.Pertanyaan || s.soal || '-',
          Soal: s.pertanyaan || s.Pertanyaan || s.soal || '-',
          TipeSoal: s.tipe || s.TipeSoal || 'Pilihan Ganda',
          PilihanA: s.opsi?.a || s.a || s.opsiA || s.pilihanA || s.PilihanA || '',
          PilihanB: s.opsi?.b || s.b || s.opsiB || s.pilihanB || s.PilihanB || '',
          PilihanC: s.opsi?.c || s.c || s.opsiC || s.pilihanC || s.PilihanC || '',
          PilihanD: s.opsi?.d || s.d || s.opsiD || s.pilihanD || s.PilihanD || '',
          PilihanE: s.opsi?.e || s.e || s.opsiE || s.pilihanE || s.PilihanE || '',
          KunciJawaban: String(s.kunci || s.kunciJawaban || s.KunciJawaban || 'a').toLowerCase(),
          PembahasanRasional: s.pembahasan || s.Pembahasan || s.PembahasanRasional || '',
          Bobot: Number(s.bobot || s.Bobot || 5),
          CreatedAt: bnk.updatedAt || new Date().toISOString()
        });
      });
    });
  }

  // 2. Gabungkan dengan rawSoal non-dummy HANYA untuk soal mandiri yang paket bank-nya belum terdaftar
  // (Jika bankId sudah terdaftar di bankSoalList, maka bankSoalList adalah otoritas tunggal untuk butir soal paket tersebut)
  const knownBankIds = new Set(
    (bankSoalList || []).map((bnk: any) => String(bnk.id || bnk.BankSoalID || '').trim()).filter(Boolean)
  );

  if (Array.isArray(rawSoal) && rawSoal.length > 0) {
    rawSoal.forEach((s: any, idx: number) => {
      if (isDummyQuestion(s)) return;
      const bankId = String(s.BankSoalID || s.bankSoalId || s.UjianID || s.ujianId || `BNK-${idx + 1}`).trim();
      
      // Proteksi krusial: Jika paket bank soal sudah ada di bankSoalList, jangan pulihkan kembali butir soal yang telah dihapus
      if (knownBankIds.has(bankId)) {
        return;
      }

      const nomor = Number(s.NomorSoal || s.nomor || s.id || idx + 1);
      const dedupeKey = `${bankId}-${nomor}`;
      const canonicalId = `SOAL-${bankId}-${nomor}`;

      const existing = soalMap.get(dedupeKey);
      const mapelName = s.MataPelajaran || s['Mata Pelajaran'] || s.mataPelajaran || s.Mapel || s.mapel || existing?.MataPelajaran || existing?.Mapel || 'Mata Pelajaran';
      const kelasName = String(s.Kelas || s.kelas || existing?.Kelas || existing?.kelas || '4').replace(/[A-Za-z]/g, '').trim() || '4';
      const jenjangName = s.Jenjang || s.jenjang || existing?.Jenjang || (Number(kelasName) <= 6 ? 'Paket A' : Number(kelasName) <= 9 ? 'Paket B' : 'Paket C');

      soalMap.set(dedupeKey, {
        DetailSoalID: canonicalId,
        UjianID: s.UjianID || s.ujianId || existing?.UjianID || bankId,
        BankSoalID: bankId,
        MataPelajaran: mapelName,
        'Mata Pelajaran': mapelName,
        Mapel: mapelName,
        Kelas: kelasName,
        kelas: kelasName,
        Jenjang: jenjangName,
        jenjang: jenjangName,
        Nomor: nomor,
        NomorSoal: nomor,
        Pertanyaan: s.Pertanyaan || s.pertanyaan || s.soal || existing?.Pertanyaan || '-',
        Soal: s.Pertanyaan || s.pertanyaan || s.soal || existing?.Pertanyaan || '-',
        TipeSoal: s.TipeSoal || s.tipe || existing?.TipeSoal || 'Pilihan Ganda',
        PilihanA: s.PilihanA || s.opsiA || s.opsi?.a || s.a || existing?.PilihanA || '',
        PilihanB: s.PilihanB || s.opsiB || s.opsi?.b || s.b || existing?.PilihanB || '',
        PilihanC: s.PilihanC || s.opsiC || s.opsi?.c || s.c || existing?.PilihanC || '',
        PilihanD: s.PilihanD || s.opsiD || s.opsi?.d || s.d || existing?.PilihanD || '',
        PilihanE: s.PilihanE || s.opsiE || s.opsi?.e || s.e || existing?.PilihanE || '',
        KunciJawaban: String(s.KunciJawaban || s.kunci || s.kunciJawaban || existing?.KunciJawaban || 'a').toLowerCase(),
        PembahasanRasional: s.PembahasanRasional || s.Pembahasan || s.pembahasan || existing?.PembahasanRasional || '',
        Bobot: Number(s.Bobot || s.bobot || existing?.Bobot || 5),
        CreatedAt: s.CreatedAt || s.createdAt || new Date().toISOString()
      });
    });
  }

  const finalSoalList = Array.from(soalMap.values());
  dataMap['SOAL'] = finalSoalList;

  // Pastikan cbt_exam_questions & soal di local DB juga terisi rapi
  if (finalSoalList.length > 0 && (!rawSoal || rawSoal.length === 0)) {
    db.set('cbt_exam_questions', finalSoalList, { skipPush: true });
    db.set('soal', finalSoalList, { skipPush: true });
  }

  const rawJawaban = db.get('cbt_answers');
  dataMap['JAWABAN'] = rawJawaban && rawJawaban.length > 0 ? rawJawaban : db.get('jawaban_ujian');

  const rawHasil = db.get('cbt_exam_results');
  const rawCbtSyncResults = db.get('cbt_results');
  const baseHasilList = (Array.isArray(rawHasil) && rawHasil.length > 0 ? rawHasil : (Array.isArray(rawCbtSyncResults) ? rawCbtSyncResults : [])) as any[];
  // Pastikan hasil penugasan TIDAK diekspor ke sheet HASIL_UJIAN peserta
  const hasilList = baseHasilList.filter((h: any) => {
    const uId = String(h.UjianID || h.idUjian || h.ujianId || h.examId || '');
    const idH = String(h.HasilUjianID || h.id || '');
    const name = String(h.NamaUjian || h.namaUjian || h.mapel || '').toLowerCase();
    return !(h.isTugas || h.isPenugasan || h.type === 'PENUGASAN' || uId.startsWith('TGS') || idH.includes('TGS') || idH.includes('SUB-') || name.startsWith('tugas '));
  });
  dataMap['HASIL_UJIAN'] = hasilList.map((h: any, idx: number) => ({
    HasilUjianID: h.HasilUjianID || h.id || `HSL-${idx + 1}`,
    UjianID: h.UjianID || h.idUjian || h.ujianId || '-',
    NamaUjian: h.NamaUjian || h.namaUjian || h.mapel || 'Ujian CBT',
    SiswaID: h.SiswaID || h.siswaId || h.id || '-',
    NISN: h.NISN || h.nisn || '-',
    NamaSiswa: h.NamaSiswa || h.namaSiswa || h.nama || 'Siswa',
    Kelas: h.Kelas || h.kelas || '-',
    Benar: h.Benar !== undefined ? h.Benar : (h.benar || 0),
    Salah: h.Salah !== undefined ? h.Salah : (h.salah || 0),
    TotalSoal: h.TotalSoal || h.totalSoal || 0,
    Nilai: h.Nilai !== undefined ? h.Nilai : (h.nilaiAkhir || h.nilai || 0),
    Ranking: h.Ranking || h.ranking || (idx + 1),
    StatusTuntas: h.StatusTuntas || h.status || 'Tuntas',
    WaktuSelesai: h.WaktuSelesai || h.waktuSelesai || new Date().toISOString(),
    CreatedAt: h.CreatedAt || h.createdAt || new Date().toISOString()
  }));

  const rawDraft = db.get('exam_drafts');
  dataMap['DRAFT_JAWABAN'] = rawDraft && rawDraft.length > 0 ? rawDraft : db.get('cbt_draft_answers');

  const rawLog = db.get('exam_logs');
  dataMap['LOG_UJIAN'] = rawLog && rawLog.length > 0 ? rawLog : db.get('cbt_proktor_logs');
  dataMap['ANALISIS_SOAL'] = db.get('cbt_analysis');

  // CBT Rapor Pendidikan (Asesmen Nasional, Mutu & Dimensi Kemdikbud)
  const rawRaporPendidikan = db.get('rapor_pendidikan_list') || [];
  dataMap['RAPOR_PENDIDIKAN'] = (Array.isArray(rawRaporPendidikan) ? rawRaporPendidikan : []).map((d: any, idx: number) => ({
    DimensiID: d.id || `DIM-${idx + 1}`,
    Tahun: d.tahun || '2026/2027',
    Kode: d.kode || 'A.1',
    NamaDimensi: d.nama || 'Dimensi Mutu',
    Skor: Number(d.skor) || 0,
    Delta: Number(d.delta) || 0,
    Kategori: d.kategori || 'Cakap',
    Warna: d.color || 'emerald',
    Deskripsi: d.deskripsi || '',
    RataNasional: Number(d.nasionalAvg) || 0,
    RataKabupaten: Number(d.kabupatenAvg) || 0,
    IndikatorJSON: JSON.stringify(d.indikatorList || []),
    RekomendasiBenahi: d.rekomendasiBenahi || '',
    UpdatedAt: new Date().toISOString()
  }));

  // 6. SPMB & PENDAFTARAN
  dataMap['PENDAFTAR'] = db.get('spmb_applicants');
  dataMap['BERKAS'] = db.get('spmb_files');
  dataMap['SELEKSI'] = db.get('spmb_selections');
  dataMap['DAFTAR_ULANG'] = db.get('spmb_re_registrations');
  dataMap['SPMB_PENDAFTAR'] = db.get('spmb_pendaftar');
  dataMap['SPMB_VERIFIKASI'] = db.get('spmb_verifikasi');
  dataMap['SPMB_SELEKSI'] = db.get('spmb_seleksi');
  dataMap['SPMB_PENGUMUMAN'] = db.get('spmb_pengumuman');
  dataMap['SPMB_DAFTAR_ULANG'] = db.get('spmb_daftar_ulang');

  // 7. KEUANGAN, TAGIHAN & KAS
  const dbKeuanganBiaya = db.get('keuangan_biaya');
  const dbSheetBiaya = db.get('BIAYA');
  const dbBiaya = db.get('tarif');
  const rawBiaya = dbKeuanganBiaya.length > 0 ? dbKeuanganBiaya : (dbSheetBiaya.length > 0 ? dbSheetBiaya : (dbBiaya.length > 0 ? dbBiaya : []));
  dataMap['BIAYA'] = rawBiaya.map((b: any, i: number) => formatBiayaForSheet(b, i));
  const dbKeuanganTagihan = db.get('keuangan_tagihan') || [];
  const dbSheetTagihan = db.get('TAGIHAN') || [];
  const rawTagihan = dbKeuanganTagihan.length > 0 ? dbKeuanganTagihan : dbSheetTagihan;
  dataMap['TAGIHAN'] = rawTagihan.map((t: any, i: number) => formatTagihanForSheet(t, i));

  const dbKeuanganBayar = db.get('keuangan_pembayaran') || [];
  const dbSheetBayar = db.get('PEMBAYARAN') || [];
  const dbInvoices = db.get('keuangan_invoices') || [];
  const rawBayar = dbKeuanganBayar.length > 0 ? dbKeuanganBayar : (dbSheetBayar.length > 0 ? dbSheetBayar : dbInvoices);
  dataMap['PEMBAYARAN'] = rawBayar.map((p: any, i: number) => formatPembayaranForSheet(p, i));

  const dbKeuanganTab = db.get('keuangan_tabungan') || [];
  const dbSheetTab = db.get('TABUNGAN') || [];
  const rawTab = dbKeuanganTab.length > 0 ? dbKeuanganTab : dbSheetTab;
  dataMap['TABUNGAN'] = rawTab.map((tb: any, i: number) => formatTabunganForSheet(tb, i));

  const dbKas = db.get('KAS') || [];
  const rawKas = dbKas.length > 0 ? dbKas : (db.get('keuangan_kas') || []);
  dataMap['KAS'] = rawKas.map((k: any, idx: number) => ({
    KasID: k.KasID || k.id || `KAS_${idx + 1}`,
    Tanggal: k.Tanggal || k.tanggal || new Date().toISOString().slice(0, 10),
    Kategori: k.Kategori || k.kategori || 'Operasional',
    Jenis: k.Jenis || k.jenis || 'MASUK',
    Masuk: Number(k.Masuk ?? k.Debit ?? k.debit ?? (k.jenis === 'MASUK' ? (k.Nominal || k.nominal || 0) : 0)),
    Keluar: Number(k.Keluar ?? k.Kredit ?? k.kredit ?? (k.jenis === 'KELUAR' ? (k.Nominal || k.nominal || 0) : 0)),
    Nominal: Number(k.Nominal || k.nominal || 0),
    Keterangan: k.Keterangan || k.keterangan || '',
    Petugas: k.Petugas || k.petugas || 'Bendahara',
    Referensi: k.Referensi || k.referensi || '-',
    Status: k.Status || k.status || 'VERIFIKASI',
    CreatedAt: k.CreatedAt || k.createdAt || new Date().toISOString(),
    UpdatedAt: k.UpdatedAt || k.updatedAt || new Date().toISOString()
  }));

  const dbInvoicesRaw = db.get('keuangan_invoices') || [];
  const rawInvoices = dbInvoicesRaw.length > 0 ? dbInvoicesRaw : rawBayar;
  dataMap['INVOICE'] = rawInvoices.map((inv: any, idx: number) => ({
    InvoiceID: inv.InvoiceID || inv.invoiceId || inv.id || `INV_${idx + 1}`,
    PembayaranID: inv.PembayaranID || inv.pembayaranId || inv.id || `BAY_${idx + 1}`,
    TagihanID: inv.TagihanID || inv.tagihanId || (inv.tagihanIds && inv.tagihanIds[0]) || '',
    SiswaID: inv.SiswaID || inv.siswaId || '',
    NamaSiswa: inv.NamaSiswa || inv.namaSiswa || '',
    Kelas: inv.Kelas || inv.namaKelas || inv.kelasId || '',
    Tanggal: inv.Tanggal || inv.tanggal || inv.tglBayar || new Date().toISOString().slice(0, 10),
    MetodePembayaran: inv.MetodePembayaran || inv.metodePembayaran || inv.metode || 'CASH',
    Total: Number(inv.Total || inv.total || inv.nominal || inv.jumlah || 0),
    Status: inv.Status || inv.status || 'PAID',
    Catatan: inv.Catatan || inv.catatan || inv.keterangan || ''
  }));

  dataMap['PENGELUARAN'] = db.get('keuangan_pengeluaran') || [];
  dataMap['JURNAL_UMUM'] = db.get('keuangan_jurnal') || [];

  // 8. BK (BIMBINGAN KONSELING)
  dataMap['BIMBINGAN'] = db.get('bk_counselings');
  dataMap['PELANGGARAN'] = db.get('bk_violations');

  // 9. PERPUSTAKAAN
  const perpusBuku = db.get('perpus_buku');
  dataMap['BUKU'] = perpusBuku.length > 0 ? perpusBuku : db.get('library_books');
  const perpusPinjam = db.get('perpus_pinjam');
  dataMap['PEMINJAMAN'] = perpusPinjam.length > 0 ? perpusPinjam : db.get('library_borrowings');
  dataMap['DENDA'] = db.get('library_fines');

  // 10. SARPRAS & INVENTARIS
  dataMap['BARANG'] = db.get('sarpras_items');
  dataMap['PEMELIHARAAN'] = db.get('sarpras_maintenance');
  dataMap['PEMINJAMAN_BARANG'] = db.get('sarpras_borrowings');

  // 11. ARSIP & DOKUMEN
  dataMap['FILE'] = db.get('archived_files');
  dataMap['ARSIP'] = db.get('archived_documents');

  // 12. DASHBOARD, BACKUP & KOMUNITAS
  dataMap['DASHBOARD_CACHE'] = db.get('dashboard_cache');
  dataMap['BACKUP'] = db.get('backup_logs');
  dataMap['SUARA_KOMUNITAS'] = db.get('suara_komunitas');

  // 13. ALUMNI & LOG UJIAN
  dataMap['ALUMNI'] = db.get('alumni');
  dataMap['LOG_UJIAN'] = db.get('exam_logs');
  dataMap['DRAFT_JAWABAN'] = db.get('exam_drafts');

  // 14. FORM BUILDER, CMS & VALIDASI DAPODIK
  dataMap['FORM_FIELDS'] = db.get('form_fields');

  const rawWebCfg = db.get('web_config');
  const webCfgObj = (Array.isArray(rawWebCfg) && rawWebCfg[0]) ? rawWebCfg[0] : (rawWebCfg && typeof rawWebCfg === 'object' && !Array.isArray(rawWebCfg) ? rawWebCfg : {});
  dataMap['WEB_CONFIG'] = [{
    appName: profileSettings.appName || webCfgObj.appName || 'ROMBEL TAMBORA',
    subJudulNavbar: profileSettings.subJudulNavbar || webCfgObj.subJudulNavbar || 'Pusat Pendidikan Inklusif Terpadu',
    judulSidebar: profileSettings.judulSidebar || webCfgObj.judulSidebar || 'SISTA ERP',
    logoUrl: profileSettings.schoolLogoUrl || webCfgObj.logoUrl || '',
    heroImageUrl: webCfgObj.heroImageUrl || '',
    teksHero: webCfgObj.heroHeadline || webCfgObj.teksHero || 'Pendidikan Inklusif & Berkualitas Di Tambora',
    heroBaris1: webCfgObj.heroHeadline || webCfgObj.heroBaris1 || 'Pendidikan Inklusif',
    heroBaris2: webCfgObj.heroBaris2 || '& Berkualitas Di Tambora',
    heroSubteks: webCfgObj.heroSubheadline || webCfgObj.heroSubteks || 'Pusat Pendidikan Inklusif Terpadu Karang Taruna Kecamatan Tambora.',
    footerJudul: webCfgObj.footerJudul || profileSettings.schoolName || 'ROMBEL TAMBORA',
    footerAlamat: webCfgObj.footerAlamat || profileSettings.schoolAddress || 'Gedung Sasana Krida Karang Taruna , Jl. Laksa II No.12, RT.012 RW.002',
    footerTelepon: webCfgObj.footerTelepon || profileSettings.schoolPhone || '0851-4180-9991',
    footerEmail: webCfgObj.footerEmail || profileSettings.schoolEmail || 'rombelkatartambora@gmail.com',
    footerHakCipta: webCfgObj.footerHakCipta || '© 2026 Rombel Karang Taruna Tambora',
    linkFb: webCfgObj.facebookUrl || webCfgObj.linkFb || 'https://facebook.com/rombelktct',
    linkIg: webCfgObj.instagramUrl || webCfgObj.linkIg || 'https://instagram.com/rombelktct',
    linkYt: webCfgObj.youtubeUrl || webCfgObj.linkYt || 'https://youtube.com/@rombelktct',
    linkTg: webCfgObj.linkTg || '',
    pendaftaranStatus: webCfgObj.pendaftaranStatus || 'Buka',
    runningText: webCfgObj.runningText || 'Pendaftaran Peserta Didik Baru (PPDB) Rombel Tambora Telah Dibuka!',
    alur1_judul: webCfgObj.alur1_judul || 'Pendaftaran Online',
    alur1_desc: webCfgObj.alur1_desc || 'Mengisi formulir registrasi online',
    alur2_judul: webCfgObj.alur2_judul || 'Verifikasi Berkas',
    alur2_desc: webCfgObj.alur2_desc || 'Pemeriksaan keabsahan dokumen',
    alur3_judul: webCfgObj.alur3_judul || 'Wawancara & Asesmen',
    alur3_desc: webCfgObj.alur3_desc || 'Pemetaan kemampuan belajar siswa',
    alur4_judul: webCfgObj.alur4_judul || 'Daftar Ulang',
    alur4_desc: webCfgObj.alur4_desc || 'Konfirmasi penerimaan siswa baru',
    visi: webCfgObj.visiSekolah || webCfgObj.visi || 'Mewujudkan pendidikan gratis, inklusif, dan berkualitas.',
    misi: webCfgObj.misiSekolah || webCfgObj.misi || 'Menyelenggarakan kegiatan belajar mengajar berkarakter mulia.'
  }];
  
  const savedDapodik = db.get('dapodik_validations');
  if (savedDapodik && savedDapodik.length > 0) {
    dataMap['DAPODIK_VALIDASI'] = savedDapodik;
  } else {
    dataMap['DAPODIK_VALIDASI'] = generateDapodikValidasiRows(students, profileSettings.academicYear || '2026/2027');
  }

  // 15. TUGAS, PRESTASI, SURAT, YATIM, EKSKUL, WA & MADING
  const savedTugas = db.get('tugas_kbm') || db.get('assignments') || [];
  dataMap['TUGAS'] = (Array.isArray(savedTugas) ? savedTugas : []).map((t: any, idx: number) => ({
    TugasID: formatTextSafe(t.TugasID || t.id || `TGS-${String(idx + 1).padStart(5, '0')}`),
    Judul: t.Judul || t.judul || 'Tugas KBM',
    Mapel: t.Mapel || t.mapel || 'Umum',
    Kelas: t.Kelas || t.kelas || '4A',
    Guru: t.Guru || t.guru || teachers[0]?.name || 'Tim Guru',
    Tenggat: formatTextSafe(t.Tenggat || t.tenggat || new Date().toISOString().slice(0, 10)),
    Kategori: t.Kategori || t.kategori || 'Kuis Pilihan Ganda (Auto-Grading)',
    Petunjuk: t.Petunjuk || t.deskripsi || '',
    Kumpul: Number(t.Kumpul || t.kumpul || 0),
    TotalSiswa: Number(t.TotalSiswa || t.totalSiswa || 0),
    Status: t.Status || t.status || 'Aktif Mengumpulkan',
    NilaiRataRata: Number(t.NilaiRataRata || t.avg || 0),
    CreatedAt: formatTextSafe(t.CreatedAt || t.createdAt || new Date().toISOString().slice(0, 10)),
    UpdatedAt: formatTextSafe(t.UpdatedAt || t.updatedAt || new Date().toISOString().slice(0, 10))
  }));

  const savedSubs = db.get('hasil_tugas_kbm') || db.get('assignment_submissions') || [];
  dataMap['PENGUMPULAN_TUGAS'] = (Array.isArray(savedSubs) ? savedSubs : []).map((p: any, idx: number) => {
    const parentTask = (Array.isArray(savedTugas) ? savedTugas : []).find((t: any) => (t.id || t.TugasID) === (p.tugasId || p.TugasID));
    return {
      PengumpulanID: formatTextSafe(p.PengumpulanID || p.id || `PST-${p.tugasId || p.TugasID || 'TGS'}-${p.studentId || p.SiswaID || idx + 1}`),
      TugasID: formatTextSafe(p.TugasID || p.tugasId || ''),
      JudulTugas: p.JudulTugas || p.judulTugas || parentTask?.judul || parentTask?.Judul || 'Tugas Siswa',
      SiswaID: formatTextSafe(p.SiswaID || p.studentId || ''),
      NISN: formatTextSafe(p.NISN || p.nisn || '-'),
      NamaSiswa: p.NamaSiswa || p.studentName || p.name || 'Siswa',
      Kelas: p.Kelas || p.kelas || '',
      Status: p.Status || p.status || 'Belum Mengumpulkan',
      Nilai: p.Nilai !== undefined && p.Nilai !== '' && p.Nilai !== null ? Number(p.Nilai) : (p.nilai !== undefined && p.nilai !== '' && p.nilai !== null ? Number(p.nilai) : ''),
      CatatanGuru: p.CatatanGuru || p.catatanGuru || '',
      FileUrl: p.FileUrl || p.fileUrl || '',
      WaktuKumpul: formatTextSafe(p.WaktuKumpul || p.submittedAt || ''),
      CreatedAt: formatTextSafe(p.CreatedAt || p.createdAt || new Date().toISOString().slice(0, 10))
    };
  });

  dataMap['PRESTASI_SISWA'] = db.get('student_achievements');
  dataMap['SURAT_MASUK'] = db.get('letters_incoming');
  dataMap['SURAT_KELUAR'] = db.get('letters_outgoing');
  dataMap['EKSKUL'] = db.get('ekskul_list');
  dataMap['EKSKUL_ANGGOTA'] = db.get('ekskul_members');
  dataMap['WA_LOG'] = db.get('wa_messages');
  const rawMading = db.get('mading_articles') || [];
  const rawBerita = db.get('berita') || db.get('web_news') || [];
  const combinedMading = rawMading.length > 0 ? rawMading : rawBerita;
  dataMap['MADING_BERITA'] = (Array.isArray(combinedMading) ? combinedMading : []).map((m: any, idx: number) => ({
    id: formatTextSafe(m.id || m.BeritaID || `BRT-${String(idx + 1).padStart(4, '0')}`),
    judul: m.judul || m.Judul || 'Informasi Rombel',
    kategori: m.kategori || m.Kategori || 'Pengumuman',
    ringkasan: m.ringkasan || m.Ringkasan || '',
    isi: m.isi || m.konten || m.Isi || '',
    penulis: m.penulis || m.Penulis || 'Admin Rombel',
    tanggal: formatTextSafe(m.tanggal || m.Tanggal || new Date().toISOString().slice(0, 10)),
    status: m.status || m.Status || 'Published',
    views: Number(m.views || m.Views || 0),
    likes: Number(m.likes || m.Likes || 0),
    pin: Boolean(m.pin || m.isPinned || false)
  }));

  const savedYatim = db.get('yatim_piatu');
  if (savedYatim.length > 0) {
    dataMap['YATIM_PIATU'] = savedYatim.map((y: any, idx: number) => ({
      ...y,
      YatimID: formatTextSafe(y.YatimID || y.yatimId || `YTM-${idx + 1}`),
      NoPDKT: formatTextSafe(y.NoPDKT || y.noPdkt || y.nis || y.id),
      NISN: formatTextSafe(y.NISN || y.nisn),
      NoHPWali: formatTextSafe(y.NoHPWali || y.noHpWali || y.noHp)
    }));
  } else {
    dataMap['YATIM_PIATU'] = students
      .filter((s: any) => {
        const st = String(s.status || '').toUpperCase().trim();
        if (
          st === 'TIDAK AKTIF' ||
          st === 'NONAKTIF' ||
          st === 'NON-AKTIF' ||
          st.includes('TIDAK') ||
          st.includes('NON') ||
          st.includes('LULUS') ||
          st.includes('PINDAH') ||
          st.includes('KELUAR') ||
          st.includes('MUTASI')
        ) {
          return false;
        }
        return s.statusYatim && s.statusYatim !== 'Lengkap';
      })
      .map((s: any, idx: number) => ({
        YatimID: `YTM-${s.id || idx + 1}`,
        NoPDKT: formatTextSafe(s.nis || s.id),
        NISN: formatTextSafe(s.nisn || s.NISN),
        NamaSiswa: s.name || s.NamaLengkap || 'Siswa',
        Kelas: s.class || '1A',
        StatusYatim: s.statusYatim,
        NamaAyah: s.namaAyah || '-',
        StatusAyah: s.statusAyah || 'Masih Hidup',
        NamaIbu: s.namaIbu || '-',
        StatusIbu: s.statusIbu || 'Masih Hidup',
        NamaWali: s.namaWali || '-',
        NoHPWali: formatTextSafe(s.tlpWali || s.noHp || '-'),
        Alamat: s.address || '-',
        PenerimaKPS_PIP: s.penerimaKps || 'Tidak',
        Keterangan: `Siswa terdaftar status ${s.statusYatim}`
      }));
  }

  // REKAP_SISWA_KELURAHAN (Hanya Siswa Aktif: Nama, RW, Kelurahan, Kelas, Status)
  dataMap['REKAP_SISWA_KELURAHAN'] = (students || [])
    .filter((s: any) => matchStatusActive(s.status || s.Status || s.statusTerbaru))
    .map((s: any, idx: number) => {
    const rawAddress = String(s.address || s.Alamat || s.alamat || '').trim();
    let kel = String(s.kelurahan || s.Kelurahan || s.kel || '').trim();
    let rw = String(s.rw || s.RW || '').trim();
    let rt = String(s.rt || s.RT || '').trim();

    if (!kel && rawAddress) {
      const matchKel = rawAddress.match(/(?:Kelurahan|Desa|Kel\.)\s+([A-Za-z\s]+?)(?:,|$|\s+RT|\s+RW)/i);
      if (matchKel && matchKel[1]) {
        kel = matchKel[1].trim();
      }
    }
    if (!kel) kel = '-';

    if (!rw && rawAddress) {
      const matchRw = rawAddress.match(/RW[\s.:]*0?([0-9]+)/i);
      if (matchRw && matchRw[1]) {
        const n = parseInt(matchRw[1], 10);
        rw = !isNaN(n) ? String(n < 10 ? '0' + n : n) : matchRw[1];
      }
    } else if (rw && rw !== '-') {
      const cleanRw = rw.replace(/^RW[\s.:]*/i, '').trim();
      const rwNum = cleanRw.replace(/[^0-9]/g, '');
      if (rwNum) {
        const n = parseInt(rwNum, 10);
        rw = !isNaN(n) ? String(n < 10 ? '0' + n : n) : rwNum;
      } else {
        rw = cleanRw;
      }
    }
    if (!rw) rw = '-';

    if (!rt && rawAddress) {
      const matchRt = rawAddress.match(/RT[\s.:]*0?([0-9]+)/i);
      if (matchRt && matchRt[1]) {
        const n = parseInt(matchRt[1], 10);
        rt = !isNaN(n) ? String(n < 10 ? '0' + n : n) : matchRt[1];
      }
    } else if (rt && rt !== '-') {
      const cleanRt = rt.replace(/^RT[\s.:]*/i, '').trim();
      const rtNum = cleanRt.replace(/[^0-9]/g, '');
      if (rtNum) {
        const n = parseInt(rtNum, 10);
        rt = !isNaN(n) ? String(n < 10 ? '0' + n : n) : rtNum;
      } else {
        rt = cleanRt;
      }
    }
    if (!rt) rt = '-';

    return {
      RekapKelurahanID: `RKL-${String(idx + 1).padStart(4, '0')}`,
      NamaSiswa: s.name || s.NamaLengkap || s.nama || 'Siswa',
      NISN: formatTextSafe(s.nisn || s.NISN || s.nis || '-'),
      RW: rw,
      RT: rt,
      Kelurahan: kel,
      Kecamatan: s.kecamatan || s.Kecamatan || 'Tambora',
      Kota: s.kota || s.Kota || 'Jakarta Barat',
      Kelas: s.class || s.KelasSaatini || s.kelas || '1A',
      Status: s.status || s.Status || 'Aktif',
      JenisKelamin: s.gender || s.JenisKelamin || 'L',
      Alamat: rawAddress || '-',
      NamaAyah: s.namaAyah || s.NamaAyah || s.fatherName || '-',
      NamaIbu: s.namaIbu || s.NamaIbu || '-',
      NoHP: formatTextSafe(s.phone || s.noHp || s.NomorHP || s.tlpAyah || s.tlpIbu || '-'),
      StatusYatim: s.statusYatim || s.StatusYatim || 'Lengkap',
      CreatedAt: s.createdAt || nowIso,
      UpdatedAt: s.updatedAt || nowIso
    };
  });

  // 16. MASTER SILABUS & KURIKULUM MODUL DOKUMEN MASTER (LANGSUNG DARI DB / SPREADSHEET)
  const savedSilabus = db.get('master_silabus') || [];
  const validatedSilabus = validateMasterSilabusSchema(savedSilabus);
  
  // Cache tautan file dari LocalStorage untuk proteksi link
  let persistedLinks: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('sista_silabus_file_links');
      if (stored) persistedLinks = JSON.parse(stored);
    } catch {
      persistedLinks = {};
    }
  }

  dataMap['MASTER_SILABUS'] = validatedSilabus.validatedData.map((r: any, idx: number) => {
    const kId = String(r.id || '').trim();
    const kNo = String(r.no || idx + 1).trim();
    const kKode = String(r.kodeSubTugas || '').trim();
    const fallback = (kId && persistedLinks[kId]) || (kNo && (persistedLinks[kNo] || persistedLinks[`NO_${kNo}`])) || (kKode && persistedLinks[kKode]);
    
    const fallbackUrl = fallback ? (fallback.fileUrl || fallback.u || fallback.url || '') : '';
    const fileUrl = r.fileUrl || r.FileUrl || r.pdfUrl || r.PdfUrl || r.linkMateri || fallbackUrl;
    const fileName = r.fileName || r.FileName || fallback?.fileName || fallback?.n || (fileUrl ? `Modul_${r.no || idx + 1}_${r.NamaMapel || 'Silabus'}.pdf` : '');

    return {
      id: r.id || `MS-${r.no || idx + 1}-${r.subKe || '1'}-${idx + 1}`,
      no: Number(r.no) || idx + 1,
      kodeJenjang: r.kodeJenjang || r.kodePaket || '',
      Jenjang: r.Jenjang || r.paket || '',
      kelas: r.kelas || '',
      semester: r.semester || 'SM-I',
      kodeMapel: r.kodeMapel || r.singkatan || '',
      NamaMapel: r.NamaMapel || r.mataPelajaran || '',
      noModul: r.noModul || 1,
      temaModul: r.temaModul || '',
      subKe: r.subKe || `Unit 1`,
      kodeSubTugas: r.kodeSubTugas || '',
      topikSubTugas: r.topikSubTugas || '',
      status: r.status || 'Tersedia',
      keterangan: r.keterangan || '',
      fileUrl,
      fileName
    };
  });

  const savedKurikulum = db.get('kurikulum_modul') || [];
  const validatedKurikulum = validateKurikulumModulSchema(savedKurikulum);
  dataMap['KURIKULUM_MODUL'] = validatedKurikulum.validatedData.map((m: any, idx: number) => ({
    id: m.id || `MOD-${idx + 1}`,
    noModul: m.noModul || idx + 1,
    kodeModul: m.kodeModul || '',
    judulModul: m.judulModul || '',
    kodeMapel: m.kodeMapel || '',
    NamaMapel: m.NamaMapel || '',
    Jenjang: m.Jenjang || '',
    kelas: m.kelas || '',
    semester: m.semester || '',
    Unit: m.Unit || '',
    materiPokok: m.materiPokok ? (Array.isArray(m.materiPokok) ? m.materiPokok.join(', ') : String(m.materiPokok)) : ''
  }));

  // 17. CP_ATP (CAPAIAN PEMBELAJARAN & ALUR TUJUAN PEMBELAJARAN KURIKULUM MERDEKA)
  const savedCpAtp = db.get('cp_atp');
  const activeCpAtpList = Array.isArray(savedCpAtp) && savedCpAtp.length > 0 ? savedCpAtp : OFFICIAL_CP_ATP_DATA;
  dataMap['CP_ATP'] = activeCpAtpList.map((item: any, idx: number) => ({
    CpaID: formatTextSafe(item.CpaID || item.id || `CP-ATP-${idx + 1}`),
    Mapel: formatTextSafe(item.Mapel || item.mapel || 'Umum'),
    Fase: formatTextSafe(item.Fase || item.fase || 'Fase B'),
    Elemen: formatTextSafe(item.Elemen || item.elemen || 'Pemahaman Konsep'),
    CapaianPembelajaran: formatTextSafe(item.CapaianPembelajaran || item.capaian || item.cp || '-'),
    TujuanPembelajaran: formatTextSafe(item.TujuanPembelajaran || item.tujuan || item.tp || '-'),
    AlurTujuan: formatTextSafe(item.AlurTujuan || item.alur || item.atp || '-'),
    Kelas: formatTextSafe(item.Kelas || item.kelas || 'Kelas 4'),
    Semester: formatTextSafe(item.Semester || item.semester || 'Ganjil')
  }));

  // 18. MATERI_DIGITAL
  const savedMateri = db.get('materi_digital') || db.get('digital_materials') || [];
  dataMap['MATERI_DIGITAL'] = (Array.isArray(savedMateri) ? savedMateri : []).map((mat: any, idx: number) => ({
    MateriID: formatTextSafe(mat.MateriID || mat.id || `MAT-${idx + 1}`),
    Judul: formatTextSafe(mat.Judul || mat.judul || 'Materi Pembelajaran'),
    Mapel: formatTextSafe(mat.Mapel || mat.mapel || 'Umum'),
    Kelas: formatTextSafe(mat.Kelas || mat.kelas || 'Semua Kelas'),
    Guru: formatTextSafe(mat.Guru || mat.guru || 'Guru Pengampu'),
    Deskripsi: formatTextSafe(mat.Deskripsi || mat.deskripsi || '-'),
    FileUrl: formatTextSafe(mat.FileUrl || mat.fileUrl || ''),
    TipeMateri: formatTextSafe(mat.TipeMateri || mat.tipe || 'PDF'),
    UkuranFile: formatTextSafe(mat.UkuranFile || mat.ukuran || '2 MB'),
    Status: formatTextSafe(mat.Status || mat.status || 'Tersedia'),
    CreatedAt: formatTextSafe(mat.CreatedAt || mat.createdAt || new Date().toISOString().slice(0, 10))
  }));

  return dataMap;
}
