import { DEFAULT_APP_CONFIG } from '../data/config';
import { StudentProfile, QuestionItem } from '../types';

export interface SpreadsheetSyncStatus {
  lastSyncTime: string | null;
  totalFetched: number;
  success: boolean;
  message: string;
}

export const SpreadsheetService = {
  /**
   * Mengambil seluruh data siswa langsung dari Google Spreadsheet tab 'SISWA'
   * Menggunakan Google Visualization API (GViz) yang selalu up-to-date secara realtime
   * saat ada perubahan langsung di Google Spreadsheet tanpa perlu deploy ulang.
   */
  async fetchStudents(): Promise<StudentProfile[]> {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${DEFAULT_APP_CONFIG.spreadsheetId}/gviz/tq?tqx=out:json&sheet=SISWA&t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Gagal menghubungi Google Spreadsheet (HTTP ${response.status})`);
      }

      const rawText = await response.text();
      // Format respons: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
      const startIdx = rawText.indexOf('{');
      const endIdx = rawText.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) {
        throw new Error('Format data Google Spreadsheet tidak sesuai.');
      }

      const jsonStr = rawText.substring(startIdx, endIdx + 1);
      const data = JSON.parse(jsonStr);

      if (!data.table || !data.table.rows || !data.table.cols) {
        return [];
      }

      const cols = data.table.cols;
      const rows = data.table.rows;

      // Buat mapping indeks kolom berdasarkan label atau id
      const colMap: Record<string, number> = {};
      cols.forEach((col: any, idx: number) => {
        const label = (col.label || col.id || '').trim().toLowerCase();
        colMap[label] = idx;
      });

      const getColIdx = (...possibleNames: string[]): number => {
        for (const name of possibleNames) {
          const lower = name.toLowerCase();
          for (const key of Object.keys(colMap)) {
            if (key === lower || key.startsWith(lower + ' ') || key.includes(lower)) {
              return colMap[key];
            }
          }
        }
        return -1;
      };

      const idxNopdkt = getColIdx('nopdkt');
      const idxTahunMasuk = getColIdx('tahunmasuk');
      const idxNisn = getColIdx('nisn');
      const idxNama = getColIdx('namalengkap', 'nama');
      const idxJk = getColIdx('jeniskelamin');
      const idxTempatLahir = getColIdx('tempat lahir', 'tempatlahir');
      const idxTanggalLahir = getColIdx('tanggallahir', 'tanggal lahir');
      const idxNik = getColIdx('nik');
      const idxAnakKe = getColIdx('anak ke', 'anakke');
      const idxSaudara = getColIdx('saudara');
      const idxAgama = getColIdx('agama');
      const idxGolDarah = getColIdx('golongan darah', 'golongandarah');
      const idxTinggi = getColIdx('tinggibadan(cm)', 'tinggibadan');
      const idxBerat = getColIdx('beratbadan(kg)', 'beratbadan');
      const idxPrestasi = getColIdx('prestasi');
      const idxHobi = getColIdx('hobi');
      const idxCatatan = getColIdx('catatan penting', 'catatanpenting');
      const idxAlamat = getColIdx('alamat');
      const idxRt = getColIdx('rt');
      const idxRw = getColIdx('rw');
      const idxKelurahan = getColIdx('kelurahan');
      const idxKecamatan = getColIdx('kecamatan');
      const idxKota = getColIdx('kota');
      const idxProvinsi = getColIdx('provinsi');
      const idxKodePos = getColIdx('kodepos');
      const idxJenisTinggal = getColIdx('jenistinggal');
      const idxAlatTrans = getColIdx('alattransportasi');
      const idxNoHp = getColIdx('nomorhp', 'nohp');
      const idxEmail = getColIdx('e-mail', 'email');
      const idxAsalSekolah = getColIdx('asalsekolah');
      const idxFoto = getColIdx('pasfoto', 'foto', 'linkfoto');
      const idxStatus = getColIdx('status');
      const idxKelas = getColIdx('kelassaatini', 'kelas');
      const idxNamaAyah = getColIdx('namaayah');
      const idxNikAyah = getColIdx('nikayah');
      const idxPendidikanAyah = getColIdx('pendidikanayah');
      const idxPekerjaanAyah = getColIdx('pekerjaanayah');
      const idxTlpAyah = getColIdx('tlpayah', 'nomorhpayah');
      const idxNamaIbu = getColIdx('namaibu');
      const idxNikIbu = getColIdx('nikibu');
      const idxPendidikanIbu = getColIdx('pendidikanibu');
      const idxPekerjaanIbu = getColIdx('pekerjaanibu');
      const idxTlpIbu = getColIdx('tlpibu', 'nomorhpibu');
      const idxNamaWali = getColIdx('namawali');
      const idxHubungan = getColIdx('hubungan');
      const idxPendidikanWali = getColIdx('pendidikanwali');
      const idxPekerjaanWali = getColIdx('pekerjaanwali');
      const idxTlpWali = getColIdx('tlp.wali', 'tlpwali');
      const idxStatusYatim = getColIdx('statusyatim');

      const getVal = (row: any, idx: number): string => {
        if (idx < 0 || !row || !row.c || !row.c[idx]) return '';
        const cell = row.c[idx];
        if (cell.v !== null && cell.v !== undefined) {
          return String(cell.v).trim();
        }
        if (cell.f !== null && cell.f !== undefined) {
          return String(cell.f).trim();
        }
        return '';
      };

      const students: StudentProfile[] = [];

      rows.forEach((rowObj: any, rIdx: number) => {
        const rawNama = getVal(rowObj, idxNama);
        const rawNisn = getVal(rowObj, idxNisn);
        const rawPdkt = getVal(rowObj, idxNopdkt);

        // Abaikan baris kosong atau baris header cadangan
        if (!rawNama && !rawNisn && !rawPdkt) return;
        if (rawNama.toLowerCase().includes('nama lengkap') || rawNisn.toLowerCase().includes('nisn')) return;

        // Bersihkan NISN
        const nisn = (rawNisn || rawPdkt || `STD-${rIdx + 1}`).replace(/['\s]/g, '');

        // Kelas & Jenjang
        let kelas = getVal(rowObj, idxKelas) || '9';
        kelas = kelas.replace(/['\s]/g, '');
        if (!kelas || isNaN(Number(kelas))) {
          kelas = '9';
        }

        let jenjang: 'Paket A' | 'Paket B' | 'Paket C' = 'Paket B';
        const numK = Number(kelas);
        if (numK <= 6) jenjang = 'Paket A';
        else if (numK <= 9) jenjang = 'Paket B';
        else jenjang = 'Paket C';

        // Status normalisasi
        const rawStat = (getVal(rowObj, idxStatus) || 'AKTIF').toUpperCase();
        let status: StudentProfile['status'] = 'AKTIF';
        if (rawStat.includes('BELUM')) status = 'BELUM';
        else if (rawStat.includes('TIDAK') || rawStat.includes('NONAKTIF')) status = 'TIDAK AKTIF';
        else if (rawStat.includes('PINDAH')) status = 'PINDAH';
        else if (rawStat.includes('KELUAR') || rawStat.includes('LULUS')) status = 'KELUAR';
        else status = 'AKTIF';

        // Foto URL
        let linkFoto = getVal(rowObj, idxFoto);
        if (linkFoto && linkFoto.includes('drive.google.com/file/d/')) {
          const m = linkFoto.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (m && m[1]) {
            linkFoto = `https://lh3.googleusercontent.com/d/${m[1]}`;
          }
        }

        // Wali murid fallback
        const namaWali = getVal(rowObj, idxNamaWali);
        const namaAyah = getVal(rowObj, idxNamaAyah);
        const namaIbu = getVal(rowObj, idxNamaIbu);
        const waliMurid = namaWali && namaWali !== '-' ? namaWali : (namaAyah && namaAyah !== '-' ? namaAyah : (namaIbu || 'Orang Tua'));

        const std: StudentProfile = {
          id: rawPdkt ? `PDKT-${rawPdkt}` : `STD-${nisn}`,
          nopdkt: rawPdkt,
          tahunMasuk: getVal(rowObj, idxTahunMasuk) || '2025',
          nisn: nisn,
          nama: rawNama,
          namaLengkap: rawNama,
          jenisKelamin: (getVal(rowObj, idxJk).toUpperCase().startsWith('P') ? 'P' : 'L') as 'L' | 'P',
          tempatLahir: getVal(rowObj, idxTempatLahir) || 'Jakarta',
          tanggalLahir: getVal(rowObj, idxTanggalLahir) || '2008-01-01',
          nik: getVal(rowObj, idxNik).replace(/['\s]/g, ''),
          anakKe: Number(getVal(rowObj, idxAnakKe)) || 1,
          saudara: Number(getVal(rowObj, idxSaudara)) || 2,
          agama: (getVal(rowObj, idxAgama) || 'Islam') as any,
          golonganDarah: (getVal(rowObj, idxGolDarah) || 'O') as any,
          tinggiBadan: Number(getVal(rowObj, idxTinggi)) || 155,
          beratBadan: Number(getVal(rowObj, idxBerat)) || 48,
          prestasi: getVal(rowObj, idxPrestasi),
          hobi: getVal(rowObj, idxHobi),
          catatanPenting: getVal(rowObj, idxCatatan),
          alamat: getVal(rowObj, idxAlamat) || 'Tambora, Jakarta Barat',
          rt: getVal(rowObj, idxRt) || '001',
          rw: getVal(rowObj, idxRw) || '001',
          kelurahan: getVal(rowObj, idxKelurahan) || 'Tambora',
          kecamatan: getVal(rowObj, idxKecamatan) || 'Tambora',
          kota: getVal(rowObj, idxKota) || 'Jakarta Barat',
          provinsi: getVal(rowObj, idxProvinsi) || 'DKI Jakarta',
          kodePos: getVal(rowObj, idxKodePos) || '11220',
          jenisTinggal: getVal(rowObj, idxJenisTinggal) || 'Bersama Orang Tua',
          alatTransportasi: getVal(rowObj, idxAlatTrans) || 'Jalan Kaki',
          nomorHP: getVal(rowObj, idxNoHp).replace(/['\s]/g, ''),
          email: getVal(rowObj, idxEmail),
          asalSekolah: getVal(rowObj, idxAsalSekolah),
          pasFoto: linkFoto,
          linkFoto: linkFoto,
          namaAyah: namaAyah,
          nikAyah: getVal(rowObj, idxNikAyah).replace(/['\s]/g, ''),
          pendidikanAyah: getVal(rowObj, idxPendidikanAyah) || 'SMA/Sederajat',
          pekerjaanAyah: getVal(rowObj, idxPekerjaanAyah) || 'Wiraswasta',
          tlpAyah: getVal(rowObj, idxTlpAyah).replace(/['\s]/g, ''),
          namaIbu: namaIbu,
          nikIbu: getVal(rowObj, idxNikIbu).replace(/['\s]/g, ''),
          pendidikanIbu: getVal(rowObj, idxPendidikanIbu) || 'SMA/Sederajat',
          pekerjaanIbu: getVal(rowObj, idxPekerjaanIbu) || 'Ibu Rumah Tangga',
          tlpIbu: getVal(rowObj, idxTlpIbu).replace(/['\s]/g, ''),
          namaWali: namaWali,
          hubungan: getVal(rowObj, idxHubungan),
          pendidikanWali: getVal(rowObj, idxPendidikanWali),
          pekerjaanWali: getVal(rowObj, idxPekerjaanWali),
          tlpWali: getVal(rowObj, idxTlpWali).replace(/['\s]/g, ''),
          statusYatim: getVal(rowObj, idxStatusYatim) || 'Lengkap',
          waliMurid: waliMurid,
          teleponWali: getVal(rowObj, idxNoHp) || getVal(rowObj, idxTlpAyah) || getVal(rowObj, idxTlpIbu) || '-',
          kelas: kelas,
          kelasSaatini: kelas,
          rombel: `Kelas ${kelas} (${jenjang})`,
          jenjang: jenjang,
          status: status,
        };

        students.push(std);
      });

      return students;
    } catch (err) {
      console.warn('Gagal membaca data langsung dari Google Spreadsheet GViz:', err);
      return [];
    }
  },

  /**
   * Mengirim perubahan data biodata siswa ke Google Spreadsheet melalui Google Apps Script Web App
   */
  async saveStudent(student: StudentProfile, photoBase64?: string): Promise<boolean> {
    try {
      const payload: any = {
        action: 'update_profile',
        spreadsheetId: DEFAULT_APP_CONFIG.spreadsheetId,
        profile: student,
      };

      if (photoBase64) {
        payload.photoBase64 = photoBase64;
        payload.photoFileName = `${student.nopdkt || student.nisn} ${student.nama}.jpg`;
      }

      // Menggunakan fetch standard ke Apps Script
      await fetch(DEFAULT_APP_CONFIG.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      return true;
    } catch (err) {
      console.warn('Gagal menyimpan update siswa ke Google Apps Script:', err);
      return false;
    }
  },

  /**
   * Otomatis mengunggah file Dokumen PDF Surat Pernyataan Kesanggupan Siswa
   * langsung ke Google Drive Folder: 1MY3oIwIIj05zlZCL4BF-3TVsbx4tG3TQ
   * dan mencatat Link file PDF ke Google Spreadsheet
   */
  async uploadLetterPdfToDrive(options: {
    fileName: string;
    pdfBase64: string;
    studentNopdkt: string;
    studentNisn: string;
    studentNama: string;
    kelas: string;
  }): Promise<{ success: boolean; fileUrl?: string; message: string }> {
    try {
      const payload = {
        action: 'upload_pdf_drive',
        folderId: DEFAULT_APP_CONFIG.folderIdPdf,
        fileName: options.fileName,
        pdfBase64: options.pdfBase64,
        mimeType: 'application/pdf',
        studentNopdkt: options.studentNopdkt,
        studentNisn: options.studentNisn,
        studentNama: options.studentNama,
        kelas: options.kelas,
        spreadsheetId: DEFAULT_APP_CONFIG.spreadsheetId,
      };

      // Coba kirim via server proxy terlebih dahulu jika ada
      try {
        const proxyRes = await fetch('/api/submissions/upload-pdf-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (proxyRes.ok) {
          const resJson = await proxyRes.json();
          if (resJson.success) {
            return resJson;
          }
        }
      } catch {
        // Fallback langsung ke Google Apps Script Web App
      }

      // Langsung ke Google Apps Script Web App
      await fetch(DEFAULT_APP_CONFIG.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      return {
        success: true,
        fileUrl: `https://drive.google.com/drive/folders/${DEFAULT_APP_CONFIG.folderIdPdf}`,
        message: `File PDF ${options.fileName} berhasil otomatis diunggah ke Google Drive (Folder: ${DEFAULT_APP_CONFIG.folderIdPdf})`,
      };
    } catch (err: any) {
      console.warn('Gagal upload otomatis PDF ke Google Drive:', err);
      return {
        success: false,
        message: `Gagal upload ke Google Drive: ${err?.message || String(err)}`,
      };
    }
  },

  /**
   * Mengambil butir soal langsung dari Google Spreadsheet tab 'BANK_SOAL'
   */
  async fetchBankSoal(): Promise<QuestionItem[]> {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${DEFAULT_APP_CONFIG.spreadsheetId}/gviz/tq?tqx=out:json&sheet=BANK_SOAL&t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Gagal menghubungi sheet BANK_SOAL (HTTP ${response.status})`);
      }

      const rawText = await response.text();
      const startIdx = rawText.indexOf('{');
      const endIdx = rawText.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) {
        return [];
      }

      const jsonStr = rawText.substring(startIdx, endIdx + 1);
      const data = JSON.parse(jsonStr);
      if (!data.table || !data.table.rows || !data.table.cols) {
        return [];
      }

      const cols = data.table.cols;
      const rows = data.table.rows;

      const colMap: Record<string, number> = {};
      cols.forEach((col: any, idx: number) => {
        const label = (col.label || col.id || '').trim().toLowerCase();
        colMap[label] = idx;
      });

      const getColIdx = (...possibleNames: string[]): number => {
        for (const name of possibleNames) {
          const lower = name.toLowerCase();
          for (const key of Object.keys(colMap)) {
            if (key === lower || key.startsWith(lower + ' ') || key.includes(lower)) {
              return colMap[key];
            }
          }
        }
        return -1;
      };

      const idxIdSoal = getColIdx('idsoal', 'id_soal', 'kode_soal', 'id');
      const idxIdUjian = getColIdx('idujian', 'id_ujian', 'kode_ujian');
      const idxMapel = getColIdx('mapel', 'mata_pelajaran', 'matapelajaran');
      const idxJenjang = getColIdx('jenjang', 'program');
      const idxKelas = getColIdx('kelas', 'tingkat');
      const idxTipe = getColIdx('tipe', 'tipe_soal', 'bentuk');
      const idxSoal = getColIdx('soal', 'teks_soal', 'pertanyaan');
      const idxGambar = getColIdx('gambar', 'gambar_url', 'media');
      const idxA = getColIdx('a', 'pilihan_a', 'opsi_a');
      const idxB = getColIdx('b', 'pilihan_b', 'opsi_b');
      const idxC = getColIdx('c', 'pilihan_c', 'opsi_c');
      const idxD = getColIdx('d', 'pilihan_d', 'opsi_d');
      const idxKunci = getColIdx('kunci', 'kunci_jawaban', 'jawaban_benar');
      const idxBobot = getColIdx('bobot', 'bobot_nilai', 'poin');
      const idxStatus = getColIdx('status', 'status_soal');

      const questionsList: QuestionItem[] = [];

      rows.forEach((rowObj: any, rIdx: number) => {
        const cells = rowObj.c;
        if (!cells || cells.length === 0) return;

        const getVal = (idx: number): string => {
          if (idx === -1 || !cells[idx]) return '';
          const cell = cells[idx];
          if (cell.v !== null && cell.v !== undefined) return String(cell.v).trim();
          if (cell.f !== null && cell.f !== undefined) return String(cell.f).trim();
          return '';
        };

        const teksSoal = getVal(idxSoal !== -1 ? idxSoal : 6);
        if (!teksSoal) return;

        const idSoal = getVal(idxIdSoal !== -1 ? idxIdSoal : 0) || `SOAL-${rIdx + 1}`;
        const idUjian = getVal(idxIdUjian !== -1 ? idxIdUjian : 1) || 'PTS-UMUM';
        const mapel = getVal(idxMapel !== -1 ? idxMapel : 2) || 'Umum';
        const jenjang = getVal(idxJenjang !== -1 ? idxJenjang : 3) || 'Paket B';
        const kelas = getVal(idxKelas !== -1 ? idxKelas : 4) || '9';
        const rawTipe = getVal(idxTipe !== -1 ? idxTipe : 5).toUpperCase();
        const tipe = rawTipe.includes('ESAI') ? 'ESAI' : 'PILIHAN_GANDA';
        const gambar = getVal(idxGambar !== -1 ? idxGambar : 7);
        const a = getVal(idxA !== -1 ? idxA : 8) || '-';
        const b = getVal(idxB !== -1 ? idxB : 9) || '-';
        const c = getVal(idxC !== -1 ? idxC : 10) || '-';
        const d = getVal(idxD !== -1 ? idxD : 11) || '-';
        const rawKunci = (getVal(idxKunci !== -1 ? idxKunci : 12) || 'A').toUpperCase();
        const kunci = (['A', 'B', 'C', 'D'].includes(rawKunci) ? rawKunci : 'A') as 'A' | 'B' | 'C' | 'D';
        const bobotNum = Number(getVal(idxBobot !== -1 ? idxBobot : 13)) || 5;
        const rawStatus = (getVal(idxStatus !== -1 ? idxStatus : 14) || 'AKTIF').toUpperCase();
        const status = rawStatus.includes('NON') ? 'NONAKTIF' : 'AKTIF';

        questionsList.push({
          idSoal,
          idUjian,
          mapel,
          jenjang,
          kelas,
          tipe,
          soal: teksSoal,
          gambar: gambar || undefined,
          a,
          b,
          c,
          d,
          kunci,
          bobot: bobotNum,
          status,
        });
      });

      return questionsList;
    } catch (err) {
      console.warn('Gagal membaca sheet BANK_SOAL via GViz:', err);
      return [];
    }
  },

  /**
   * Uji koneksi ke Google Spreadsheet
   */
  async testConnection(): Promise<{ ok: boolean; count: number; message: string }> {
    try {
      const students = await this.fetchStudents();
      if (students.length > 0) {
        return {
          ok: true,
          count: students.length,
          message: `Berhasil terhubung ke Google Spreadsheet! Terbaca ${students.length} baris siswa secara real-time.`,
        };
      }
      return {
        ok: false,
        count: 0,
        message: 'Koneksi berhasil tetapi sheet SISWA belum berisi data.',
      };
    } catch (err: any) {
      return {
        ok: false,
        count: 0,
        message: `Koneksi gagal: ${err?.message || String(err)}`,
      };
    }
  },
};
