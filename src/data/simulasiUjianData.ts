// Data Paket Soal Simulasi Ujian CBT (Non-Persistent)
// SELURUH DUMMY SIMULASI TELAH DIHAPUS BERSIH.
// Seluruh paket soal CBT kini murni 100% bersumber dari Google Spreadsheet (Sheet BANK_SOAL & SOAL).

export interface SimulasiExamPackage {
  id: string;
  judul: string;
  mapel: string;
  kelas: string;
  jenisUjian: string;
  durasi: number; // menit
  token: string;
  deskripsi: string;
  isSimulation?: boolean;
  isCbtExam?: boolean;
  soalList: {
    id: number;
    pertanyaan: string;
    tipe: string;
    opsi: {
      a: string;
      b: string;
      c: string;
      d: string;
      e?: string;
    };
    kunci: string;
    bobot: number;
    pembahasan: string;
    gambar?: string;
  }[];
}

export const SIMULASI_PELAJARAN_IPAS: SimulasiExamPackage = {
  id: 'SIM-EMPTY',
  judul: 'Tidak Ada Paket Dummy',
  mapel: '',
  kelas: '',
  jenisUjian: '',
  durasi: 0,
  token: '',
  deskripsi: '',
  isSimulation: true,
  isCbtExam: true,
  soalList: []
};

// Seluruh dummy simulasi lokal telah dikosongkan.
// Aplikasi menggunakan paket soal resmi sekolah dari Google Spreadsheet.
export const DAFTAR_SIMULASI_PELAJARAN: SimulasiExamPackage[] = [];
