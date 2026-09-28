// Master Data Jadwal Pelajaran Rombongan Belajar (Rombel) KTCT Tambora
// Disesuaikan persis dengan matriks 27 Sesi Pembagian Kelompok Belajar (Aktif Bekerja vs Tidak Bekerja)

export interface MasterJadwalRow {
  no: number;
  jenjang: 'Paket A' | 'Paket B' | 'Paket C';
  kelas: string; // '4' - '12'
  tidakBekerja: {
    tersedia: boolean;
    hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu' | '';
    jam: string;
    jamMulai: string;
    jamSelesai: string;
    label: string;
  };
  aktifBekerja: {
    tersedia: boolean;
    hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
    jam: string;
    jamMulai: string;
    jamSelesai: string;
    label: string;
  };
  mataPembelajaran: string;
  daftarMapel: string[];
}

export const MASTER_JADWAL_ROWS: MasterJadwalRow[] = [
  // Paket A - Kelas 4
  {
    no: 1,
    jenjang: 'Paket A',
    kelas: '4',
    tidakBekerja: { tersedia: true, hari: 'Senin', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Senin, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Senin', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Senin, 19:30' },
    mataPembelajaran: 'IPA, IPS, PAI',
    daftarMapel: ['IPA', 'IPS', 'PAI']
  },
  {
    no: 2,
    jenjang: 'Paket A',
    kelas: '4',
    tidakBekerja: { tersedia: true, hari: 'Kamis', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Kamis, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Rabu', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Rabu, 19:30' },
    mataPembelajaran: 'Bahasa Indonesia, PKN',
    daftarMapel: ['Bahasa Indonesia', 'PKN']
  },
  {
    no: 3,
    jenjang: 'Paket A',
    kelas: '4',
    tidakBekerja: { tersedia: true, hari: 'Minggu', jam: '10:00', jamMulai: '10:00', jamSelesai: '12:00', label: 'Minggu, 10:00' },
    aktifBekerja: { tersedia: true, hari: 'Minggu', jam: '10:00', jamMulai: '10:00', jamSelesai: '12:00', label: 'Minggu, 10:00' },
    mataPembelajaran: 'Matematika, Literasi Baca Tulis',
    daftarMapel: ['Matematika', 'Literasi Baca Tulis']
  },

  // Paket A - Kelas 5
  {
    no: 4,
    jenjang: 'Paket A',
    kelas: '5',
    tidakBekerja: { tersedia: true, hari: 'Senin', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Senin, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Senin', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Senin, 19:30' },
    mataPembelajaran: 'IPA, IPS, PAI',
    daftarMapel: ['IPA', 'IPS', 'PAI']
  },
  {
    no: 5,
    jenjang: 'Paket A',
    kelas: '5',
    tidakBekerja: { tersedia: true, hari: 'Kamis', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Kamis, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Rabu', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Rabu, 19:30' },
    mataPembelajaran: 'Bahasa Indonesia, PKN',
    daftarMapel: ['Bahasa Indonesia', 'PKN']
  },
  {
    no: 6,
    jenjang: 'Paket A',
    kelas: '5',
    tidakBekerja: { tersedia: true, hari: 'Minggu', jam: '10:00', jamMulai: '10:00', jamSelesai: '12:00', label: 'Minggu, 10:00' },
    aktifBekerja: { tersedia: true, hari: 'Minggu', jam: '10:00', jamMulai: '10:00', jamSelesai: '12:00', label: 'Minggu, 10:00' },
    mataPembelajaran: 'Matematika, Literasi Baca Tulis',
    daftarMapel: ['Matematika', 'Literasi Baca Tulis']
  },

  // Paket A - Kelas 6
  {
    no: 7,
    jenjang: 'Paket A',
    kelas: '6',
    tidakBekerja: { tersedia: true, hari: 'Senin', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Senin, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Senin', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Senin, 19:30' },
    mataPembelajaran: 'IPA, IPS, PAI',
    daftarMapel: ['IPA', 'IPS', 'PAI']
  },
  {
    no: 8,
    jenjang: 'Paket A',
    kelas: '6',
    tidakBekerja: { tersedia: true, hari: 'Kamis', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Kamis, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Rabu', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Rabu, 19:30' },
    mataPembelajaran: 'Bahasa Indonesia, PKN',
    daftarMapel: ['Bahasa Indonesia', 'PKN']
  },
  {
    no: 9,
    jenjang: 'Paket A',
    kelas: '6',
    tidakBekerja: { tersedia: true, hari: 'Minggu', jam: '10:00', jamMulai: '10:00', jamSelesai: '12:00', label: 'Minggu, 10:00' },
    aktifBekerja: { tersedia: true, hari: 'Minggu', jam: '10:00', jamMulai: '10:00', jamSelesai: '12:00', label: 'Minggu, 10:00' },
    mataPembelajaran: 'Matematika, Literasi Baca Tulis',
    daftarMapel: ['Matematika', 'Literasi Baca Tulis']
  },

  // Paket B - Kelas 7
  {
    no: 10,
    jenjang: 'Paket B',
    kelas: '7',
    tidakBekerja: { tersedia: true, hari: 'Senin', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Senin, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Senin', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Senin, 19:30' },
    mataPembelajaran: 'IPA, IPS, PAI',
    daftarMapel: ['IPA', 'IPS', 'PAI']
  },
  {
    no: 11,
    jenjang: 'Paket B',
    kelas: '7',
    tidakBekerja: { tersedia: true, hari: 'Kamis', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Kamis, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Rabu', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Rabu, 19:30' },
    mataPembelajaran: 'Bahasa Indonesia, PKN',
    daftarMapel: ['Bahasa Indonesia', 'PKN']
  },
  {
    no: 12,
    jenjang: 'Paket B',
    kelas: '7',
    tidakBekerja: { tersedia: true, hari: 'Minggu', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Minggu, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Minggu', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Minggu, 13:00' },
    mataPembelajaran: 'Matematika, Bahasa Inggris',
    daftarMapel: ['Matematika', 'Bahasa Inggris']
  },

  // Paket B - Kelas 8
  {
    no: 13,
    jenjang: 'Paket B',
    kelas: '8',
    tidakBekerja: { tersedia: true, hari: 'Senin', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Senin, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Senin', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Senin, 19:30' },
    mataPembelajaran: 'IPA, IPS, PAI',
    daftarMapel: ['IPA', 'IPS', 'PAI']
  },
  {
    no: 14,
    jenjang: 'Paket B',
    kelas: '8',
    tidakBekerja: { tersedia: true, hari: 'Kamis', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Kamis, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Rabu', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Rabu, 19:30' },
    mataPembelajaran: 'Bahasa Indonesia, PKN',
    daftarMapel: ['Bahasa Indonesia', 'PKN']
  },
  {
    no: 15,
    jenjang: 'Paket B',
    kelas: '8',
    tidakBekerja: { tersedia: true, hari: 'Minggu', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Minggu, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Minggu', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Minggu, 13:00' },
    mataPembelajaran: 'Matematika, Bahasa Inggris',
    daftarMapel: ['Matematika', 'Bahasa Inggris']
  },

  // Paket B - Kelas 9
  {
    no: 16,
    jenjang: 'Paket B',
    kelas: '9',
    tidakBekerja: { tersedia: true, hari: 'Senin', jam: '15:30', jamMulai: '15:30', jamSelesai: '17:30', label: 'Senin, 15:30' },
    aktifBekerja: { tersedia: true, hari: 'Senin', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Senin, 19:30' },
    mataPembelajaran: 'IPA, IPS, PAI',
    daftarMapel: ['IPA', 'IPS', 'PAI']
  },
  {
    no: 17,
    jenjang: 'Paket B',
    kelas: '9',
    tidakBekerja: { tersedia: true, hari: 'Kamis', jam: '15:30', jamMulai: '15:30', jamSelesai: '17:30', label: 'Kamis, 15:30' },
    aktifBekerja: { tersedia: true, hari: 'Rabu', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Rabu, 19:30' },
    mataPembelajaran: 'Bahasa Indonesia, PKN',
    daftarMapel: ['Bahasa Indonesia', 'PKN']
  },
  {
    no: 18,
    jenjang: 'Paket B',
    kelas: '9',
    tidakBekerja: { tersedia: true, hari: 'Minggu', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Minggu, 13:00' },
    aktifBekerja: { tersedia: true, hari: 'Minggu', jam: '13:00', jamMulai: '13:00', jamSelesai: '15:00', label: 'Minggu, 13:00' },
    mataPembelajaran: 'Matematika, Bahasa Inggris',
    daftarMapel: ['Matematika', 'Bahasa Inggris']
  },

  // Paket C - Kelas 10
  {
    no: 19,
    jenjang: 'Paket C',
    kelas: '10',
    tidakBekerja: { tersedia: true, hari: 'Senin', jam: '15:30', jamMulai: '15:30', jamSelesai: '17:30', label: 'Senin, 15:30' },
    aktifBekerja: { tersedia: true, hari: 'Senin', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Senin, 19:30' },
    mataPembelajaran: 'Ekonomi, Geografi, Sejarah',
    daftarMapel: ['Ekonomi', 'Geografi', 'Sejarah']
  },
  {
    no: 20,
    jenjang: 'Paket C',
    kelas: '10',
    tidakBekerja: { tersedia: true, hari: 'Kamis', jam: '15:30', jamMulai: '15:30', jamSelesai: '17:30', label: 'Kamis, 15:30' },
    aktifBekerja: { tersedia: true, hari: 'Rabu', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Rabu, 19:30' },
    mataPembelajaran: 'B. Indo, PKN, PAI',
    daftarMapel: ['Bahasa Indonesia', 'PKN', 'PAI']
  },
  {
    no: 21,
    jenjang: 'Paket C',
    kelas: '10',
    tidakBekerja: { tersedia: true, hari: 'Minggu', jam: '15:30', jamMulai: '15:30', jamSelesai: '17:30', label: 'Minggu, 15:30' },
    aktifBekerja: { tersedia: true, hari: 'Minggu', jam: '15:30', jamMulai: '15:30', jamSelesai: '17:30', label: 'Minggu, 15:30' },
    mataPembelajaran: 'MTK, SJI, Sosiologi, B. Inggris',
    daftarMapel: ['Matematika', 'Sejarah Kebudayaan Islam (SJI)', 'Sosiologi', 'Bahasa Inggris']
  },

  // Paket C - Kelas 11 (Semua Siswa Terjadwal di Kelompok Aktif Bekerja)
  {
    no: 22,
    jenjang: 'Paket C',
    kelas: '11',
    tidakBekerja: { tersedia: false, hari: '', jam: '-', jamMulai: '', jamSelesai: '', label: '-' },
    aktifBekerja: { tersedia: true, hari: 'Senin', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Senin, 19:30' },
    mataPembelajaran: 'Ekonomi, Geografi, Sejarah',
    daftarMapel: ['Ekonomi', 'Geografi', 'Sejarah']
  },
  {
    no: 23,
    jenjang: 'Paket C',
    kelas: '11',
    tidakBekerja: { tersedia: false, hari: '', jam: '-', jamMulai: '', jamSelesai: '', label: '-' },
    aktifBekerja: { tersedia: true, hari: 'Rabu', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Rabu, 19:30' },
    mataPembelajaran: 'B. Indo, PKN, PAI',
    daftarMapel: ['Bahasa Indonesia', 'PKN', 'PAI']
  },
  {
    no: 24,
    jenjang: 'Paket C',
    kelas: '11',
    tidakBekerja: { tersedia: false, hari: '', jam: '-', jamMulai: '', jamSelesai: '', label: '-' },
    aktifBekerja: { tersedia: true, hari: 'Minggu', jam: '15:30', jamMulai: '15:30', jamSelesai: '17:30', label: 'Minggu, 15:30' },
    mataPembelajaran: 'MTK, SJI, Sosiologi, B. Inggris',
    daftarMapel: ['Matematika', 'Sejarah Kebudayaan Islam (SJI)', 'Sosiologi', 'Bahasa Inggris']
  },

  // Paket C - Kelas 12 (Semua Siswa Terjadwal di Kelompok Aktif Bekerja)
  {
    no: 25,
    jenjang: 'Paket C',
    kelas: '12',
    tidakBekerja: { tersedia: false, hari: '', jam: '-', jamMulai: '', jamSelesai: '', label: '-' },
    aktifBekerja: { tersedia: true, hari: 'Senin', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Senin, 19:30' },
    mataPembelajaran: 'Ekonomi, Geografi, Sejarah',
    daftarMapel: ['Ekonomi', 'Geografi', 'Sejarah']
  },
  {
    no: 26,
    jenjang: 'Paket C',
    kelas: '12',
    tidakBekerja: { tersedia: false, hari: '', jam: '-', jamMulai: '', jamSelesai: '', label: '-' },
    aktifBekerja: { tersedia: true, hari: 'Rabu', jam: '19:30', jamMulai: '19:30', jamSelesai: '21:30', label: 'Rabu, 19:30' },
    mataPembelajaran: 'B. Indo, PKN, PAI',
    daftarMapel: ['Bahasa Indonesia', 'PKN', 'PAI']
  },
  {
    no: 27,
    jenjang: 'Paket C',
    kelas: '12',
    tidakBekerja: { tersedia: false, hari: '', jam: '-', jamMulai: '', jamSelesai: '', label: '-' },
    aktifBekerja: { tersedia: true, hari: 'Minggu', jam: '15:30', jamMulai: '15:30', jamSelesai: '17:30', label: 'Minggu, 15:30' },
    mataPembelajaran: 'MTK, SJI, Sosiologi, B. Inggris',
    daftarMapel: ['Matematika', 'Sejarah Kebudayaan Islam (SJI)', 'Sosiologi', 'Bahasa Inggris']
  }
];

// Helper untuk mengubah dataset 27 baris menjadi format sesi jadwal individual (JadwalItem)
export function generateJadwalItemsFromMaster(
  defaultTahunAjaran: string = '2026/2027',
  defaultSemester: 'Ganjil' | 'Genap' = 'Ganjil'
) {
  const items: any[] = [];

  MASTER_JADWAL_ROWS.forEach(row => {
    // 1. Sesi untuk Kelompok Tidak Bekerja (jika tersedia)
    if (row.tidakBekerja.tersedia && row.tidakBekerja.hari) {
      items.push({
        id: `JDW-TB-${row.no}-${row.kelas}-${row.tidakBekerja.hari}`,
        masterNo: row.no,
        jenjang: row.jenjang,
        kelas: row.kelas,
        hari: row.tidakBekerja.hari,
        jamMulai: row.tidakBekerja.jamMulai,
        jamSelesai: row.tidakBekerja.jamSelesai,
        mataPelajaran: row.mataPembelajaran,
        daftarMapel: row.daftarMapel,
        kategoriBelajar: 'Tidak Bekerja',
        guru: 'Tutor Pengampu Rombel',
        ruang: `Ruang KBM Kelas ${row.kelas} (Siang/Sore)`,
        semester: defaultSemester,
        tahunAjaran: defaultTahunAjaran
      });
    }

    // 2. Sesi untuk Kelompok Aktif Bekerja (Malam/Minggu)
    if (row.aktifBekerja.tersedia && row.aktifBekerja.hari) {
      // Jika waktu dan harinya sama persis dengan kelompok Tidak Bekerja (misal sesi Minggu),
      // kita tandai sebagai "Semua Kelompok" agar tidak dobel sesi
      const isSameTime = row.tidakBekerja.tersedia && 
        row.tidakBekerja.hari === row.aktifBekerja.hari && 
        row.tidakBekerja.jamMulai === row.aktifBekerja.jamMulai;

      if (!isSameTime) {
        items.push({
          id: `JDW-AB-${row.no}-${row.kelas}-${row.aktifBekerja.hari}`,
          masterNo: row.no,
          jenjang: row.jenjang,
          kelas: row.kelas,
          hari: row.aktifBekerja.hari,
          jamMulai: row.aktifBekerja.jamMulai,
          jamSelesai: row.aktifBekerja.jamSelesai,
          mataPelajaran: row.mataPembelajaran,
          daftarMapel: row.daftarMapel,
          kategoriBelajar: 'Aktif Bekerja',
          guru: 'Tutor Pengampu Rombel',
          ruang: `Ruang KBM Kelas ${row.kelas} (Malam)`,
          semester: defaultSemester,
          tahunAjaran: defaultTahunAjaran
        });
      } else {
        // Gabungan sesi bersama (misal Minggu pagi / siang / sore bersama)
        // Update kategori sesi yang sudah dimasukkan sebelumnya menjadi 'Semua'
        const existingIdx = items.findIndex(
          it => it.kelas === row.kelas && it.hari === row.aktifBekerja.hari && it.jamMulai === row.aktifBekerja.jamMulai
        );
        if (existingIdx >= 0) {
          items[existingIdx].kategoriBelajar = 'Semua';
          items[existingIdx].ruang = `Ruang KBM Kelas ${row.kelas} (Sesi Bersama)`;
        }
      }
    }
  });

  return items;
}

/**
 * Mengambil tepat 3 Sesi Pertemuan Mingguan Khusus Siswa
 * Berdasarkan Kelas dan Status Bekerja (Aktif Bekerja / Tidak Bekerja)
 */
export function getStudentPersonalJadwal(
  studentClass: string | number,
  statusBekerjaOrKelompok?: string,
  defaultTahunAjaran: string = '2026/2027',
  defaultSemester: 'Ganjil' | 'Genap' = 'Ganjil'
) {
  const cleanClass = String(studentClass || '4').replace(/\D/g, '') || '4';
  
  // Tentukan apakah siswa masuk kelompok bekerja
  const statusStr = String(statusBekerjaOrKelompok || '').toLowerCase();
  const isWorking = (cleanClass === '11' || cleanClass === '12') ||
    statusStr.includes('aktif') || 
    statusStr.includes('kerja') || 
    statusStr.includes('malam');

  const rows = MASTER_JADWAL_ROWS.filter(r => r.kelas === cleanClass);
  const studentSessions: any[] = [];

  rows.forEach((row, idx) => {
    let sesi: any;
    let kat: string;
    let shiftLabel: string;

    if (isWorking) {
      sesi = row.aktifBekerja;
      kat = 'Aktif Bekerja';
      shiftLabel = '🌙 Sesi Malam / Minggu';
    } else {
      if (row.tidakBekerja.tersedia && row.tidakBekerja.hari) {
        sesi = row.tidakBekerja;
        kat = 'Tidak Bekerja';
        shiftLabel = '☀️ Sesi Siang / Minggu';
      } else {
        sesi = row.aktifBekerja;
        kat = 'Aktif Bekerja';
        shiftLabel = '🌙 Sesi Gabungan';
      }
    }

    if (sesi && sesi.hari) {
      studentSessions.push({
        id: `JDW-MHS-${row.no}-${row.kelas}-${sesi.hari}`,
        masterNo: row.no,
        pertemuanKe: idx + 1,
        jenjang: row.jenjang,
        kelas: row.kelas,
        hari: sesi.hari,
        jam: `${sesi.jamMulai} - ${sesi.jamSelesai}`,
        jamMulai: sesi.jamMulai,
        jamSelesai: sesi.jamSelesai,
        mapel: row.mataPembelajaran,
        mataPelajaran: row.mataPembelajaran,
        daftarMapel: row.daftarMapel,
        kategoriBelajar: kat,
        shiftLabel: shiftLabel,
        guru: 'Tutor Pengampu Rombel',
        ruang: `Ruang KBM Kelas ${row.kelas} (${isWorking ? 'Malam' : 'Siang'})`,
        semester: defaultSemester,
        tahunAjaran: defaultTahunAjaran,
        isPersonal: true
      });
    }
  });

  return studentSessions;
}
