import { Siswa, Guru, AbsensiRecord, HariLibur, SchoolConfig, KelasItem } from '../types';
import { MASTER_TABLES_60 } from './masterDatabase60';

export const MASTER_60_TABS = MASTER_TABLES_60.map((t) => {
  let mod = 'SISTEM';
  const cat = t.category.toUpperCase();
  if (cat.includes('DASHBOARD')) mod = 'SISTEM';
  else if (cat.includes('PENGATURAN')) mod = 'SISTEM';
  else if (cat.includes('SPMB')) mod = 'SPMB';
  else if (cat.includes('MASTER') || cat.includes('SISWA') || cat.includes('GURU')) mod = 'SISKO';
  else if (cat.includes('ABSENSI')) mod = 'ABSENSI';
  else if (cat.includes('NILAI') || cat.includes('RAPOR')) mod = 'NILAI';
  else if (cat.includes('CBT') || cat.includes('UJIAN')) mod = 'UJIAN';
  else if (cat.includes('KEUANGAN') || cat.includes('SPP')) mod = 'KEUANGAN';
  else if (cat.includes('SARPRAS') || cat.includes('INVENTARIS')) mod = 'SARPRAS';
  else if (cat.includes('ARSIP') || cat.includes('SURAT')) mod = 'ARSIP';
  
  return {
    id: t.id,
    name: t.name,
    module: mod,
    description: t.description,
    columns: t.headers
  };
});

export const INITIAL_CLASSES: KelasItem[] = [];

export const INITIAL_SISWA: Siswa[] = [];

export const INITIAL_GURU: Guru[] = [];

export const INITIAL_HOLIDAYS: HariLibur[] = [
  { id: 'h1', tanggal: '2026-08-17', keterangan: 'HUT Kemerdekaan RI' },
  { id: 'h2', tanggal: '2026-09-24', keterangan: 'Maulid Nabi Muhammad SAW' }
];

export const INITIAL_CONFIG: SchoolConfig = {
  jam_masuk_mulai: '06:00',
  jam_masuk_akhir: '07:15',
  jam_pulang_mulai: '15:00',
  jam_pulang_akhir: '17:00',
  jamMasukMulai: '06:00',
  jamMasukSelesai: '07:15',
  jamPulangMulai: '15:00',
  jamPulangSelesai: '17:00',
  mode_absen: 'masuk_pulang',
  hariLibur: INITIAL_HOLIDAYS,
  jadwal_harian: {
    '1': { libur: false, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '15:00', pulang_akhir: '17:00' },
    '2': { libur: false, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '15:00', pulang_akhir: '17:00' },
    '3': { libur: false, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '15:00', pulang_akhir: '17:00' },
    '4': { libur: false, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '15:00', pulang_akhir: '17:00' },
    '5': { libur: false, masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '11:30', pulang_akhir: '14:00' },
    '6': { libur: true, libur_rutinan: true, ket_libur: 'Libur Sabtu', masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '12:00', pulang_akhir: '14:00' },
    '7': { libur: true, libur_rutinan: true, ket_libur: 'Libur Minggu', masuk_mulai: '06:00', masuk_akhir: '07:15', pulang_mulai: '12:00', pulang_akhir: '14:00' }
  }
};

export function generateInitialAttendance(siswa: Siswa[], dateStr: string): AbsensiRecord[] {
  // Generate realistic attendance records for today or a specific date
  return siswa.map((s, idx) => {
    // Make some present, late, sick, permitted, or absent
    if (idx % 7 === 0) {
      return {
        id: `att_${dateStr}_${s.nisn}`,
        tanggal: dateStr,
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.kelas,
        jamDatang: '07:28:12',
        jamPulang: '15:05:22',
        keterangan: 'Terlambat 13m',
        status: 'Hadir'
      };
    } else if (idx % 11 === 0) {
      return {
        id: `att_${dateStr}_${s.nisn}`,
        tanggal: dateStr,
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.kelas,
        jamDatang: '-',
        jamPulang: '-',
        keterangan: 'Surat dokter terlampir',
        status: 'Sakit'
      };
    } else if (idx % 13 === 0) {
      return {
        id: `att_${dateStr}_${s.nisn}`,
        tanggal: dateStr,
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.kelas,
        jamDatang: '-',
        jamPulang: '-',
        keterangan: 'Izin lomba akademik',
        status: 'Izin'
      };
    } else if (idx === 3) {
      return {
        id: `att_${dateStr}_${s.nisn}`,
        tanggal: dateStr,
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.kelas,
        jamDatang: '06:55:10',
        jamPulang: '-',
        keterangan: 'Tepat Waktu',
        status: 'Hadir'
      };
    } else {
      return {
        id: `att_${dateStr}_${s.nisn}`,
        tanggal: dateStr,
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.kelas,
        jamDatang: `06:${45 + (idx % 15)}:${10 + idx}`,
        jamPulang: '15:02:44',
        keterangan: 'Tepat Waktu',
        status: 'Hadir'
      };
    }
  });
}
