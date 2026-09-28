import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExamSubmission, StudentProfile, IndividualStatAnalysis } from '../types';

export const ExportService = {
  // 1. Export Excel Spreadsheet (.xlsx)
  exportToExcel(submissions: ExamSubmission[], fileName = 'Rekapitulasi_Nilai_PTS_KTCT.xlsx') {
    const formattedData = submissions.map((sub, index) => ({
      No: index + 1,
      ID_Hasil: sub.idHasil,
      NISN: `'${sub.nisn}`,
      Nama_Siswa: sub.namaSiswa,
      Jenjang: sub.jenjang,
      Kelas: sub.kelas,
      Mata_Pelajaran: sub.mapel,
      Nilai_Mentah: sub.nilaiMentah,
      Benar: sub.jmlBenar,
      Salah: sub.jmlSalah,
      Total_Soal: sub.totalSoal,
      Pelanggaran: sub.pelanggaran,
      Nilai_Akhir: sub.nilaiAkhir,
      Status: sub.status,
      Durasi: sub.durasiPengerjaan,
      Waktu_Selesai: sub.waktuSelesai,
      Tahun_Ajaran: sub.tahunAjaran,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 12 }, // ID_Hasil
      { wch: 14 }, // NISN
      { wch: 26 }, // Nama_Siswa
      { wch: 8 },  // Jenjang
      { wch: 8 },  // Kelas
      { wch: 22 }, // Mata_Pelajaran
      { wch: 12 }, // Nilai_Mentah
      { wch: 8 },  // Benar
      { wch: 8 },  // Salah
      { wch: 10 }, // Total_Soal
      { wch: 12 }, // Pelanggaran
      { wch: 12 }, // Nilai_Akhir
      { wch: 16 }, // Status
      { wch: 18 }, // Durasi
      { wch: 20 }, // Waktu_Selesai
      { wch: 12 }, // Tahun_Ajaran
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai PTS');
    XLSX.writeFile(workbook, fileName);
  },

  // 1b. Export Students List to Excel (Buku Induk Lengkap)
  exportStudentsToExcel(students: StudentProfile[], fileName = 'Buku_Induk_Siswa_KTCT.xlsx') {
    const formattedData = students.map((s, index) => ({
      No: index + 1,
      NOPDKT: s.nopdkt || `KTCT-${s.tahunMasuk || '2025'}-${s.nisn.slice(-4)}`,
      Tahun_Masuk: s.tahunMasuk || '2025',
      NISN: `'${s.nisn}`,
      Nama_Lengkap: s.namaLengkap || s.nama,
      Jenis_Kelamin: s.jenisKelamin || 'L',
      Tempat_Lahir: s.tempatLahir || 'Jakarta',
      Tanggal_Lahir: s.tanggalLahir || '2010-01-01',
      NIK: s.nik ? `'${s.nik}` : `317301${s.nisn}`,
      Anak_Ke: s.anakKe || 1,
      Saudara: s.saudara || 2,
      Agama: s.agama || 'Islam',
      Golongan_Darah: s.golonganDarah || 'O',
      Tinggi_Badan_cm: s.tinggiBadan || 155,
      Berat_Badan_kg: s.beratBadan || 48,
      Prestasi: s.prestasi || '-',
      Hobi: s.hobi || '-',
      Catatan_Penting: s.catatanPenting || '-',
      Alamat: s.alamat || 'Jl. Tambora Raya',
      RT: s.rt || '005',
      RW: s.rw || '03',
      Kelurahan: s.kelurahan || 'Tambora',
      Kecamatan: s.kecamatan || 'Tambora',
      Kota: s.kota || 'Jakarta Barat',
      Provinsi: s.provinsi || 'DKI Jakarta',
      Kode_Pos: s.kodePos || '11220',
      Jenis_Tinggal: s.jenisTinggal || 'Bersama Orang Tua',
      Alat_Transportasi: s.alatTransportasi || 'Jalan Kaki',
      Nomor_HP: s.nomorHP ? `'${s.nomorHP}` : (s.teleponWali ? `'${s.teleponWali}` : '-'),
      Email: s.email || `${s.nisn}@siswa.ktct.sch.id`,
      Asal_Sekolah: s.asalSekolah || 'SD Negeri Tambora',
      SKHUN: s.skhun || `DN-01/D-SD/13/${s.nisn.slice(-6)}`,
      Penerima_KPS: s.penerimaKPS || 'Tidak',
      Nomor_Kartu_Keluarga: s.nomorKartuKeluarga ? `'${s.nomorKartuKeluarga}` : `3173010101100001`,
      Nama_Ayah: s.namaAyah || s.waliMurid || 'Ayah',
      NIK_Ayah: s.nikAyah ? `'${s.nikAyah}` : '3173010101700001',
      Tempat_Lahir_Ayah: s.tempatLahirAyah || 'Jakarta',
      Tanggal_Lahir_Ayah: s.tanggalLahirAyah || '1975-05-10',
      Pendidikan_Ayah: s.pendidikanAyah || 'SMA/Sederajat',
      Pekerjaan_Ayah: s.pekerjaanAyah || 'Karyawan Swasta',
      Penghasilan_Ayah: s.penghasilanAyah || 'Rp 3.000.000 - Rp 5.000.000',
      Tlp_Ayah: s.tlpAyah ? `'${s.tlpAyah}` : (s.teleponWali ? `'${s.teleponWali}` : '-'),
      Status_Ayah: s.statusAyah || 'Masih Hidup',
      Nama_Ibu: s.namaIbu || 'Ibu',
      NIK_Ibu: s.nikIbu ? `'${s.nikIbu}` : '3173010101800002',
      Tempat_Lahir_Ibu: s.tempatLahirIbu || 'Jakarta',
      Tanggal_Lahir_Ibu: s.tanggalLahirIbu || '1980-08-15',
      Pendidikan_Ibu: s.pendidikanIbu || 'SMA/Sederajat',
      Pekerjaan_Ibu: s.pekerjaanIbu || 'Ibu Rumah Tangga',
      Penghasilan_Ibu: s.penghasilanIbu || '< Rp 1.000.000',
      Tlp_Ibu: s.tlpIbu ? `'${s.tlpIbu}` : '-',
      Status_Ibu: s.statusIbu || 'Masih Hidup',
      Status_Yatim: s.statusYatim || 'Lengkap',
      Nama_Wali: s.namaWali || s.waliMurid || '-',
      Tempat_Lahir_Wali: s.tempatLahirWali || '-',
      Tgl_Lahir_Wali: s.tglLahirWali || '-',
      Pendidikan_Wali: s.pendidikanWali || '-',
      Pekerjaan_Wali: s.pekerjaanWali || '-',
      Penghasilan_Wali: s.penghasilanWali || '-',
      Hubungan_Wali: s.hubungan || 'Orang Tua Kandung',
      Tlp_Wali: s.tlpWali ? `'${s.tlpWali}` : (s.teleponWali ? `'${s.teleponWali}` : '-'),
      Akta_Kelahiran: s.aktaKelahiran || 'Ada',
      Kartu_Keluarga: s.kartuKeluarga || 'Ada',
      KIA: s.kia || 'Ada',
      KTP_Ayah: s.ktpAyah || 'Ada',
      KTP_Ibu: s.ktpIbu || 'Ada',
      Ijazah: s.ijazah || 'Ada',
      KTP_Wali: s.ktpWali || 'Ada',
      Rapor: s.rapor || 'Ada',
      S_Pindah: s.sPindah || 'Tidak Perlu',
      SuKet: s.suKet || 'Ada',
      S_Domisili: s.sDomisili || 'Ada',
      Status: s.status,
      Jenjang: s.jenjang,
      Kelas_Saat_Ini: s.kelasSaatini || s.kelas,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku Induk Siswa');
    XLSX.writeFile(workbook, fileName);
  },

  // 1c. Download Template Excel/CSV 70 Header Buku Induk Dapodik
  downloadBukuIndukTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
    const sampleRows = [
      {
        No: 1,
        NOPDKT: 'KTCT-2025-4508',
        Tahun_Masuk: '2025',
        NISN: '0081234508',
        Nama_Lengkap: 'Farhan Maulana Pratama',
        Jenis_Kelamin: 'L',
        Tempat_Lahir: 'Jakarta',
        Tanggal_Lahir: '2010-04-12',
        NIK: '3173010412100001',
        Anak_Ke: 1,
        Saudara: 2,
        Agama: 'Islam',
        Golongan_Darah: 'O',
        Tinggi_Badan_cm: 160,
        Berat_Badan_kg: 52,
        Prestasi: 'Juara 2 Catur Pelajar Tambora',
        Hobi: 'Sepak Bola & Membaca',
        Catatan_Penting: 'Tidak ada alergi makanan',
        Alamat: 'Jl. Tambora Raya No. 18',
        RT: '004',
        RW: '03',
        Kelurahan: 'Tambora',
        Kecamatan: 'Tambora',
        Kota: 'Jakarta Barat',
        Provinsi: 'DKI Jakarta',
        Kode_Pos: '11220',
        Jenis_Tinggal: 'Bersama Orang Tua',
        Alat_Transportasi: 'Jalan Kaki',
        Nomor_HP: '081298765432',
        Email: 'farhan.maulana@siswa.ktct.sch.id',
        Asal_Sekolah: 'SDN Tambora 01 Pagi',
        SKHUN: 'DN-01/D-SD/13/008123',
        Penerima_KPS: 'Tidak',
        Nomor_Kartu_Keluarga: '3173011203090002',
        Nama_Ayah: 'Bapak Hendra',
        NIK_Ayah: '3173011005750001',
        Tempat_Lahir_Ayah: 'Jakarta',
        Tanggal_Lahir_Ayah: '1975-05-10',
        Pendidikan_Ayah: 'SMA/Sederajat',
        Pekerjaan_Ayah: 'Karyawan Swasta',
        Penghasilan_Ayah: 'Rp 3.000.000 - Rp 5.000.000',
        Tlp_Ayah: '081234567801',
        Status_Ayah: 'Masih Hidup',
        Nama_Ibu: 'Ibu Ratna',
        NIK_Ibu: '3173011508800002',
        Tempat_Lahir_Ibu: 'Jakarta',
        Tanggal_Lahir_Ibu: '1980-08-15',
        Pendidikan_Ibu: 'SMA/Sederajat',
        Pekerjaan_Ibu: 'Ibu Rumah Tangga',
        Penghasilan_Ibu: '< Rp 1.000.000',
        Tlp_Ibu: '081234567899',
        Status_Ibu: 'Masih Hidup',
        Status_Yatim: 'Lengkap',
        Nama_Wali: '-',
        Tempat_Lahir_Wali: '-',
        Tgl_Lahir_Wali: '-',
        Pendidikan_Wali: '-',
        Pekerjaan_Wali: '-',
        Penghasilan_Wali: '-',
        Hubungan_Wali: 'Orang Tua Kandung',
        Tlp_Wali: '-',
        Akta_Kelahiran: 'Ada',
        Kartu_Keluarga: 'Ada',
        KIA: 'Ada',
        KTP_Ayah: 'Ada',
        KTP_Ibu: 'Ada',
        Ijazah: 'Ada',
        KTP_Wali: 'Tidak Ada',
        Rapor: 'Ada',
        S_Pindah: 'Tidak Perlu',
        SuKet: 'Ada',
        S_Domisili: 'Ada',
        Status: 'AKTIF',
        Jenjang: 'Paket B',
        Kelas_Saat_Ini: '9',
      },
      {
        No: 2,
        NOPDKT: 'KTCT-2025-4509',
        Tahun_Masuk: '2025',
        NISN: '0081234509',
        Nama_Lengkap: 'Annisa Rahmawati',
        Jenis_Kelamin: 'P',
        Tempat_Lahir: 'Bandung',
        Tanggal_Lahir: '2011-09-20',
        NIK: '3173016009110003',
        Anak_Ke: 2,
        Saudara: 3,
        Agama: 'Islam',
        Golongan_Darah: 'A',
        Tinggi_Badan_cm: 152,
        Berat_Badan_kg: 44,
        Prestasi: 'Lomba Pidato Bahasa Indonesia',
        Hobi: 'Menulis Cerpen',
        Catatan_Penting: '-',
        Alamat: 'Jl. Jembatan Besi II No. 5',
        RT: '002',
        RW: '01',
        Kelurahan: 'Jembatan Besi',
        Kecamatan: 'Tambora',
        Kota: 'Jakarta Barat',
        Provinsi: 'DKI Jakarta',
        Kode_Pos: '11320',
        Jenis_Tinggal: 'Bersama Orang Tua',
        Alat_Transportasi: 'Sepeda Motor',
        Nomor_HP: '081387654321',
        Email: 'annisa.rahma@siswa.ktct.sch.id',
        Asal_Sekolah: 'SDN Jembatan Besi 03',
        SKHUN: 'DN-01/D-SD/13/008124',
        Penerima_KPS: 'KIP',
        Nomor_Kartu_Keluarga: '3173012204100005',
        Nama_Ayah: 'Bapak Suryadi',
        NIK_Ayah: '3173011406720004',
        Tempat_Lahir_Ayah: 'Bandung',
        Tanggal_Lahir_Ayah: '1972-06-14',
        Pendidikan_Ayah: 'SMP/Sederajat',
        Pekerjaan_Ayah: 'Wiraswasta',
        Penghasilan_Ayah: 'Rp 2.000.000 - Rp 3.000.000',
        Tlp_Ayah: '081234567802',
        Status_Ayah: 'Masih Hidup',
        Nama_Ibu: 'Ibu Nurul',
        NIK_Ibu: '3173015507770003',
        Tempat_Lahir_Ibu: 'Jakarta',
        Tanggal_Lahir_Ibu: '1977-07-15',
        Pendidikan_Ibu: 'SMA/Sederajat',
        Pekerjaan_Ibu: 'Pedagang',
        Penghasilan_Ibu: 'Rp 1.000.000 - Rp 2.000.000',
        Tlp_Ibu: '081234567803',
        Status_Ibu: 'Masih Hidup',
        Status_Yatim: 'Lengkap',
        Nama_Wali: '-',
        Tempat_Lahir_Wali: '-',
        Tgl_Lahir_Wali: '-',
        Pendidikan_Wali: '-',
        Pekerjaan_Wali: '-',
        Penghasilan_Wali: '-',
        Hubungan_Wali: 'Orang Tua Kandung',
        Tlp_Wali: '-',
        Akta_Kelahiran: 'Ada',
        Kartu_Keluarga: 'Ada',
        KIA: 'Ada',
        KTP_Ayah: 'Ada',
        KTP_Ibu: 'Ada',
        Ijazah: 'Ada',
        KTP_Wali: 'Tidak Ada',
        Rapor: 'Ada',
        S_Pindah: 'Tidak Perlu',
        SuKet: 'Ada',
        S_Domisili: 'Ada',
        Status: 'AKTIF',
        Jenjang: 'Paket B',
        Kelas_Saat_Ini: '8',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Format_70_Buku_Induk');

    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'Template_70_Header_Buku_Induk_Dapodik_KTCT.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      XLSX.writeFile(workbook, 'Template_70_Header_Buku_Induk_Dapodik_KTCT.xlsx');
    }
  },

  // 2. Export Master Report to PDF
  exportToPDF(
    submissions: ExamSubmission[],
    title = 'REKAPITULASI HASIL PENILAIAN TENGAH SEMESTER (PTS)',
    subtitle = 'Rombongan Belajar Karang Taruna Kecamatan Tambora - TA 2025/2026'
  ) {
    const doc = new jsPDF('landscape', 'pt', 'a4');

    // Header Kop Resmi
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 65, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('ROMBONGAN BELAJAR KARANG TARUNA KECAMATAN TAMBORA (KTCT)', 40, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(226, 232, 240);
    doc.text('SISTEM CBT ONLINE PENILAIAN TENGAH SEMESTER (PTS) TERINTEGRASI', 40, 46);

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 40, 90);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${subtitle} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, 40, 105);

    // Table Content
    const tableData = submissions.map((s, idx) => [
      idx + 1,
      s.nisn,
      s.namaSiswa,
      `${s.jenjang} - Kelas ${s.kelas}`,
      s.mapel,
      s.nilaiMentah,
      s.pelanggaran > 0 ? `${s.pelanggaran}x (-${s.pelanggaran * 5})` : '0',
      s.nilaiAkhir,
      s.status.replace(/[^\w\s]/gi, '').trim(),
      s.durasiPengerjaan,
    ]);

    autoTable(doc, {
      startY: 120,
      head: [['No', 'NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Mentah', 'Pelanggaran', 'Nilai Akhir', 'Status', 'Durasi']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229], // Indigo 600
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        1: { halign: 'center', cellWidth: 70 },
        2: { cellWidth: 140 },
        3: { halign: 'center', cellWidth: 80 },
        4: { cellWidth: 120 },
        5: { halign: 'center', cellWidth: 50 },
        6: { halign: 'center', cellWidth: 70 },
        7: { halign: 'center', fontStyle: 'bold', cellWidth: 60 },
        8: { halign: 'center', cellWidth: 80 },
        9: { halign: 'center', cellWidth: 80 },
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // Signature Footer
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    if (finalY < doc.internal.pageSize.getHeight() - 80) {
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('Mengetahui,', 650, finalY);
      doc.text('Koordinator Pendidikan Karang Taruna Tambora', 650, finalY + 12);
      doc.setFont('helvetica', 'bold');
      doc.text('( Kak Hendra Gunawan, S.Kom )', 650, finalY + 55);
    }

    doc.save('Rekap_Nilai_PTS_KTCT.pdf');
  },

  // 3. Export Official Student Report Card (Rapor PTS Mandiri)
  exportStudentReportCardPDF(
    student: StudentProfile,
    submissions: ExamSubmission[],
    analysis: IndividualStatAnalysis
  ) {
    const doc = new jsPDF('portrait', 'pt', 'a4');

    // Header Kop
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 75, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('ROMBONGAN BELAJAR KARANG TARUNA KECAMATAN TAMBORA', 40, 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225);
    doc.text('Sekretariat: Kantor Camat Tambora, Jakarta Barat | Email: info@ktct.id', 40, 46);
    doc.text('LAPORAN HASIL PENILAIAN TENGAH SEMESTER (PTS) TAHUN AJARAN 2025/2026', 40, 60);

    // Student Info Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40, 95, 515, 75, 6, 6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    doc.text('Nama Siswa', 55, 115);
    doc.text(':', 140, 115);
    doc.setFont('helvetica', 'normal');
    doc.text(student.nama, 150, 115);

    doc.setFont('helvetica', 'bold');
    doc.text('NISN', 55, 132);
    doc.text(':', 140, 132);
    doc.setFont('helvetica', 'normal');
    doc.text(student.nisn, 150, 132);

    doc.setFont('helvetica', 'bold');
    doc.text('Kelas / Rombel', 55, 149);
    doc.text(':', 140, 149);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student.jenjang} - Kelas ${student.kelas} (${student.rombel})`, 150, 149);

    doc.setFont('helvetica', 'bold');
    doc.text('Wali Murid', 340, 115);
    doc.text(':', 420, 115);
    doc.setFont('helvetica', 'normal');
    doc.text(student.waliMurid || 'Orang Tua / Wali', 430, 115);

    doc.setFont('helvetica', 'bold');
    doc.text('Rata-rata Nilai', 340, 132);
    doc.text(':', 420, 132);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(`${analysis.rataRataNilai} / 100`, 430, 132);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('Skor Kejujuran', 340, 149);
    doc.text(':', 420, 149);
    doc.setFont('helvetica', 'normal');
    doc.text(`${analysis.integritasScore}% (Disiplin)`, 430, 149);

    // Table of Grades
    const tableData = submissions.map((s, idx) => [
      idx + 1,
      s.mapel,
      65, // KKM Standar
      s.nilaiMentah,
      s.pelanggaran,
      s.nilaiAkhir,
      s.status.replace(/[^\w\s]/gi, '').trim(),
      s.nilaiAkhir >= 75 ? 'Tuntas' : 'Perlu Remidi',
    ]);

    autoTable(doc, {
      startY: 185,
      head: [['No', 'Mata Pelajaran', 'KKM', 'Mentah', 'Pelanggaran', 'Nilai Akhir', 'Predikat', 'Keterangan']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { cellWidth: 160 },
        2: { halign: 'center', cellWidth: 40 },
        3: { halign: 'center', cellWidth: 50 },
        4: { halign: 'center', cellWidth: 65 },
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 65 },
        6: { halign: 'center', cellWidth: 55 },
        7: { halign: 'center', cellWidth: 55 },
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
    });

    // Catatan Akademik & Rekomendasi
    const notesY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(40, notesY, 515, 80, 6, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Catatan Wali Kelas & Analisis Perkembangan Siswa:', 55, notesY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const rekText = analysis.rekomendasi.length > 0
      ? analysis.rekomendasi[0]
      : 'Tingkatkan kedisiplinan belajar dan konsistensi dalam mengerjakan soal latihan.';
    doc.text(`1. ${rekText}`, 55, notesY + 34);

    const kekText = analysis.kekuatan.length > 0
      ? analysis.kekuatan[0]
      : 'Siswa menunjukkan motivasi dan partisipasi aktif dalam bimbingan belajar.';
    doc.text(`2. Kekuatan Utama: ${kekText}`, 55, notesY + 48);

    doc.text(`3. Status Verifikasi: Sistem CBT Anti-Nyontek mencatat tingkat integritas ${analysis.integritasScore}%.`, 55, notesY + 62);

    // Signatures
    const sigY = notesY + 105;
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    doc.text('Orang Tua / Wali Murid,', 60, sigY);
    doc.text('( ....................................... )', 60, sigY + 50);

    doc.text('Jakarta, ' + new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }), 380, sigY);
    doc.text('Wali Kelas / Pengawas CBT,', 380, sigY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text('( Ibu Ratna Dewi, M.Pd )', 380, sigY + 50);

    doc.save(`Rapor_PTS_${student.nisn}_${student.nama.replace(/\s+/g, '_')}.pdf`);
  },
};
