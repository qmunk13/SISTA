import {
  Siswa,
  Guru,
  Kelas,
  Mapel,
  HariLibur,
  Pendaftar,
  AgendaGuru,
  AbsensiSiswa,
  NilaiSiswa,
  SoalCBT,
  JadwalUjian,
  HasilUjian,
  LogUjian,
  Biaya,
  Tagihan,
  Tabungan,
  BimbinganBK,
  PelanggaranBK,
  BukuPerpus,
  PeminjamanBuku,
  BarangInventaris,
  PeminjamanBarang,
  DokumenArsip,
  WebConfig,
  AuditLog,
  User
} from '../types';
import { db } from '../data/db';

export class MockDb {
  public static get<T>(key: string, initial?: T): T {
    const val = db.get<any>(key);
    if (val === undefined || val === null) {
      if (initial !== undefined && initial !== null) {
        if (Array.isArray(initial)) {
          db.set(key, initial);
        } else {
          db.setSingle(key, initial);
        }
        return initial;
      }
    }
    return val as unknown as T;
  }

  public static set<T>(key: string, value: T): void {
    if (Array.isArray(value)) {
      db.set(key, value);
    } else {
      db.setSingle(key, value);
    }
  }

  // Unified Getters & Setters pointing directly to central db
  public static get users(): User[] { return db.get<User>('users'); }
  public static set users(val: User[]) { db.set('users', val); }

  public static get kelas(): Kelas[] { return db.get<Kelas>('kelas'); }
  public static set kelas(val: Kelas[]) { db.set('kelas', val); }

  public static get mapel(): Mapel[] { return db.get<Mapel>('mapel'); }
  public static set mapel(val: Mapel[]) { db.set('mapel', val); }

  public static get siswa(): Siswa[] { return db.get<Siswa>('siswa'); }
  public static set siswa(val: Siswa[]) { db.set('siswa', val); }

  public static get guru(): Guru[] { return db.get<Guru>('guru'); }
  public static set guru(val: Guru[]) { db.set('guru', val); }

  public static get biaya(): Biaya[] { return db.get<Biaya>('biaya'); }
  public static set biaya(val: Biaya[]) { db.set('biaya', val); }

  public static get tagihan(): Tagihan[] { return db.get<Tagihan>('tagihan'); }
  public static set tagihan(val: Tagihan[]) { db.set('tagihan', val); }

  public static get tabungan(): Tabungan[] { return db.get<Tabungan>('tabungan'); }
  public static set tabungan(val: Tabungan[]) { db.set('tabungan', val); }

  public static get soal(): SoalCBT[] { return db.get<SoalCBT>('soal'); }
  public static set soal(val: SoalCBT[]) { db.set('soal', val); }

  public static get jadwalUjian(): JadwalUjian[] { return db.get<JadwalUjian>('ujian'); }
  public static set jadwalUjian(val: JadwalUjian[]) { db.set('ujian', val); }

  public static get webConfig(): WebConfig { return db.getSingle<WebConfig>('web_config'); }
  public static set webConfig(val: WebConfig) { db.setSingle('web_config', val); }

  public static get webGallery(): any[] { return db.get<any>('web_gallery'); }
  public static set webGallery(val: any[]) { db.set('web_gallery', val); }

  public static get webDownloads(): any[] { return db.get<any>('web_downloads'); }
  public static set webDownloads(val: any[]) { db.set('web_downloads', val); }

  public static get arsip(): any[] { return db.get<any>('arsip'); }
  public static set arsip(val: any[]) { db.set('arsip', val); }

  public static get setting(): any[] { return db.get<any>('setting'); }
  public static set setting(val: any[]) { db.set('setting', val); }

  public static get pendaftar(): Pendaftar[] { return db.get<Pendaftar>('spmb_pendaftar'); }
  public static set pendaftar(val: Pendaftar[]) { db.set('spmb_pendaftar', val); }

  public static get absensiSiswa(): AbsensiSiswa[] { return db.get<AbsensiSiswa>('absensi'); }
  public static set absensiSiswa(val: AbsensiSiswa[]) { db.set('absensi', val); }

  public static get agendaGuru(): AgendaGuru[] { return db.get<AgendaGuru>('agenda'); }
  public static set agendaGuru(val: AgendaGuru[]) { db.set('agenda', val); }

  public static get nilaiSiswa(): NilaiSiswa[] { return db.get<NilaiSiswa>('nilai'); }
  public static set nilaiSiswa(val: NilaiSiswa[]) { db.set('nilai', val); }

  public static get hasilUjian(): HasilUjian[] { return db.get<HasilUjian>('hasil_ujian'); }
  public static set hasilUjian(val: HasilUjian[]) { db.set('hasil_ujian', val); }

  public static get bimbinganBK(): BimbinganBK[] { return db.get<BimbinganBK>('bimbingan'); }
  public static set bimbinganBK(val: BimbinganBK[]) { db.set('bimbingan', val); }

  public static get pelanggaranBK(): PelanggaranBK[] { return db.get<PelanggaranBK>('pelanggaran'); }
  public static set pelanggaranBK(val: PelanggaranBK[]) { db.set('pelanggaran', val); }

  public static get bukuPerpus(): BukuPerpus[] { return db.get<BukuPerpus>('buku'); }
  public static set bukuPerpus(val: BukuPerpus[]) { db.set('buku', val); }

  public static get peminjamanBuku(): PeminjamanBuku[] { return db.get<PeminjamanBuku>('peminjaman_buku'); }
  public static set peminjamanBuku(val: PeminjamanBuku[]) { db.set('peminjaman_buku', val); }

  public static get barangInventaris(): BarangInventaris[] { return db.get<BarangInventaris>('barang'); }
  public static set barangInventaris(val: BarangInventaris[]) { db.set('barang', val); }

  public static get peminjamanBarang(): PeminjamanBarang[] { return db.get<PeminjamanBarang>('peminjaman_barang'); }
  public static set peminjamanBarang(val: PeminjamanBarang[]) { db.set('peminjaman_barang', val); }

  public static get dokumenArsip(): DokumenArsip[] { return db.get<DokumenArsip>('arsip'); }
  public static set dokumenArsip(val: DokumenArsip[]) { db.set('arsip', val); }

  public static get hariLibur(): HariLibur[] { return db.get<HariLibur>('hari_libur'); }
  public static set hariLibur(val: HariLibur[]) { db.set('hari_libur', val); }

  public static get auditLogs(): AuditLog[] { return db.get<AuditLog>('logs'); }
  public static set auditLogs(val: AuditLog[]) { db.set('logs', val); }

  public static get logUjian(): LogUjian[] { return db.get<LogUjian>('log_ujian'); }
  public static set logUjian(val: LogUjian[]) { db.set('log_ujian', val); }

  public static log(who: string, action: string, meta: any) {
    const logs = db.get<AuditLog>('logs');
    logs.unshift({
      id: 'LOG_' + Date.now(),
      ts: new Date().toISOString(),
      who,
      action,
      meta: JSON.stringify(meta)
    });
    db.set('logs', logs);
  }
}
