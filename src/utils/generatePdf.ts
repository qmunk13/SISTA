import { jsPDF } from 'jspdf';
import { StudentProfile, WorkInfo, StudySchedule } from '../types';

export interface GeneratePdfOptions {
  profile: StudentProfile;
  work: WorkInfo;
  schedule: StudySchedule;
}

// Builds the F4 jsPDF document
export function createLetterPdfDoc(options: GeneratePdfOptions): { doc: jsPDF; fileName: string } {
  const { profile, work, schedule } = options;

  const currentKelas =
    profile.KelasSaatini ||
    profile.kelasSaatIni ||
    profile.kelasRombel ||
    profile.kelas ||
    profile.tingkat ||
    'Paket C - Kelas X (Rombel Tambora)';

  const cleanNopdkt = (profile.nopdkt || profile.idNumber || '001').trim();
  const cleanKelas = currentKelas.trim().replace(/[\/\\?%*:|"<>]/g, '-');
  const cleanNama = (profile.namaLengkap || 'Siswa').trim().replace(/[\/\\?%*:|"<>]/g, '-');
  const pdfFileName = `${cleanNopdkt}_${cleanKelas}_${cleanNama}.pdf`;

  const nomorInduk = `${profile.nopdkt || profile.idNumber || '-'} / ${profile.nisn || profile.NISN || '-'} / ${profile.nik || profile.NIK || '-'}`;

  const statusPekerjaanText =
    work.statusBekerja === 'Aktif'
      ? `Aktif (${work.namaTempatKerja || '-'} - ${work.jenisPekerjaan || '-'})`
      : 'Tidak Bekerja (Fokus Belajar Penuh)';

  const alamatText = `${profile.alamat || '-'}, RT ${profile.rt || '005'} / RW ${profile.rw || '002'}, Kel. ${profile.kelurahan || profile.Kelurahan || 'Tambora'}, Kec. ${profile.kecamatan || profile.Kecamatan || 'Tambora'}`;

  const namaOrtuWali =
    profile.namaOrangTua ||
    (profile.namaAyah ? `${profile.namaAyah} / ${profile.namaIbu || '-'}` : (profile.namaWali || '-'));

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const h1 = schedule.hariBelajar[0] || 'Hari 1';
  const j1 = (schedule.jadwalPerHari && schedule.jadwalPerHari[h1]) || schedule.jamBelajar || '18:30 - 20:30 WIB';
  const h2 = schedule.hariBelajar[1] || 'Hari 2';
  const j2 = (schedule.jadwalPerHari && schedule.jadwalPerHari[h2]) || schedule.jamBelajar || '18:30 - 20:30 WIB';
  const h3 = schedule.hariBelajar[2] || 'Hari 3';
  const j3 = (schedule.jadwalPerHari && schedule.jadwalPerHari[h3]) || schedule.jamBelajar || '18:30 - 20:30 WIB';

  // F4 / Folio: 215 mm x 330 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215, 330],
  });

  const margin = 18;
  const contentWidth = 215 - margin * 2; // 179 mm
  let y = 22;

  // Title: SURAT PERNYATAAN KESANGGUPAN SISWA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 25, 40);
  doc.text('SURAT PERNYATAAN KESANGGUPAN SISWA', 107.5, y, { align: 'center' });

  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(50, 60, 80);
  doc.text('ROMBONGAN BELAJAR KARANG TARUNA KECAMATAN TAMBORA', 107.5, y, { align: 'center' });

  y += 3;
  doc.setDrawColor(30, 40, 60);
  doc.setLineWidth(0.6);
  doc.line(107.5 - 40, y, 107.5 + 40, y);

  // Preamble
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text(
    'Saya yang bertanda tangan di bawah ini, siswa Rombongan Belajar Karang Taruna Kecamatan Tambora:',
    margin,
    y
  );

  // Student Identity Box
  y += 4;
  const boxStartY = y;
  const boxPadding = 3.5;
  const labelX = margin + boxPadding;
  const colonX = labelX + 44;
  const valX = colonX + 2;

  const fields: [string, string][] = [
    ['Nama Lengkap Siswa', profile.namaLengkap || '-'],
    ['Nomor Induk', nomorInduk],
    ['Tempat, Tanggal Lahir', `${profile.tempatLahir || '-'}, ${profile.tanggalLahir || '-'}`],
    ['Jenis Kelamin / Status', `${profile.jenisKelamin || profile.JenisKelamin || 'Laki-laki'} | Status: ${profile.statusYatim || 'Bukan Yatim/Piatu'}`],
    ['Kelas Saat Ini', currentKelas],
    ['Nomor WhatsApp', profile.noHpWa || profile.NomorHP || '-'],
    ['Nama Orang Tua / Wali', namaOrtuWali],
    ['Status Pekerjaan', statusPekerjaanText],
    ['Alamat Domisili Siswa', alamatText],
  ];

  let currentFieldY = y + boxPadding + 1.5;
  doc.setFontSize(8.5);

  fields.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 75, 85);
    doc.text(label, labelX, currentFieldY);

    doc.text(':', colonX, currentFieldY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);

    const maxValWidth = contentWidth - 48;
    const splitVal = doc.splitTextToSize(val, maxValWidth);
    doc.text(splitVal, valX, currentFieldY);

    const lineCount = Array.isArray(splitVal) ? splitVal.length : 1;
    currentFieldY += Math.max(lineCount * 3.8, 4.2);
  });

  const boxHeight = currentFieldY - boxStartY + 1;
  doc.setFillColor(248, 249, 251);
  doc.setDrawColor(200, 205, 215);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, boxStartY, contentWidth, boxHeight, 2, 2, 'S');

  // Statements Section
  y = boxStartY + boxHeight + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text('Menyatakan dengan sesungguhnya dan penuh tanggung jawab bahwa:', margin, y);

  // Point 1
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('1.', margin, y);
  doc.text('Komitmen Kehadiran Belajar Wajib 3 (Tiga) Kali Seminggu:', margin + 5, y);

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const p1Text =
    'Saya bersedia, sanggup, dan berkomitmen hadir secara disiplin mengikuti seluruh proses pembelajaran tatap muka minimal 3x dalam seminggu dengan rincian jadwal yang telah disepakati sebagai berikut:';
  const splitP1 = doc.splitTextToSize(p1Text, contentWidth - 5);
  doc.text(splitP1, margin + 5, y);

  y += (Array.isArray(splitP1) ? splitP1.length : 1) * 3.8 + 2;

  // 3-Column Schedule Box
  const scheduleBoxY = y;
  const colWidth = (contentWidth - 10) / 3;
  doc.setFillColor(245, 247, 252);
  doc.setDrawColor(180, 195, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin + 5, scheduleBoxY, contentWidth - 10, 14, 1.5, 1.5, 'FD');

  const sCol1 = margin + 5;
  const sCol2 = sCol1 + colWidth;
  const sCol3 = sCol2 + colWidth;

  // Day 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 80, 140);
  doc.text('SESI HARI KE-1', sCol1 + colWidth / 2, scheduleBoxY + 3.5, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(h1, sCol1 + colWidth / 2, scheduleBoxY + 7.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 70);
  doc.text(j1, sCol1 + colWidth / 2, scheduleBoxY + 11.5, { align: 'center' });

  // Divider 1
  doc.setDrawColor(210, 220, 235);
  doc.line(sCol2, scheduleBoxY + 1.5, sCol2, scheduleBoxY + 12.5);

  // Day 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 80, 140);
  doc.text('SESI HARI KE-2', sCol2 + colWidth / 2, scheduleBoxY + 3.5, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(h2, sCol2 + colWidth / 2, scheduleBoxY + 7.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 70);
  doc.text(j2, sCol2 + colWidth / 2, scheduleBoxY + 11.5, { align: 'center' });

  // Divider 2
  doc.line(sCol3, scheduleBoxY + 1.5, sCol3, scheduleBoxY + 12.5);

  // Day 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 80, 140);
  doc.text('SESI HARI KE-3', sCol3 + colWidth / 2, scheduleBoxY + 3.5, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(h3, sCol3 + colWidth / 2, scheduleBoxY + 7.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 70);
  doc.text(j3, sCol3 + colWidth / 2, scheduleBoxY + 11.5, { align: 'center' });

  // Point 2
  y = scheduleBoxY + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text('2.', margin, y);

  const p2Text =
    'Kepatuhan Tata Tertib & Norma Kesopanan: Saya berjanji mematuhi seluruh tata tertib yang berlaku, menjaga ketertiban umum, menjunjung tinggi etika kesopanan, menghormati tutor pengajar, serta menaati seluruh petunjuk dan arahan Pengurus Karang Taruna Kecamatan Tambora.';
  const splitP2 = doc.splitTextToSize(p2Text, contentWidth - 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text(splitP2, margin + 5, y);

  y += (Array.isArray(splitP2) ? splitP2.length : 1) * 3.8 + 2;

  // Point 3 (Sanctions)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 30, 30);
  doc.text('3.', margin, y);

  const p3Text =
    'Konsekuensi Sanksi Tegas Pelanggaran: Apabila saya terbukti melanggar tata tertib, membolos, atau tidak hadir tanpa keterangan yang sah melebihi batas toleransi (3 kali berturut-turut), maka saya bersedia menerima sanksi tegas berupa pencabutan fasilitas belajar, pencabutan status bantuan/subsidi rombel Karang Taruna, serta sanksi administratif dan pengembalian kepada orang tua/wali.';
  const splitP3 = doc.splitTextToSize(p3Text, contentWidth - 5);
  doc.setFont('helvetica', 'normal');
  doc.text(splitP3, margin + 5, y);

  y += (Array.isArray(splitP3) ? splitP3.length : 1) * 3.8 + 3;

  // Closing
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8);
  const closingText =
    'Demikian Surat Pernyataan Kesanggupan ini saya buat dengan sebenarnya dalam keadaan sadar, sehat jasmani dan rohani, serta tanpa adanya paksaan dari pihak manapun, untuk dijadikan pedoman resmi komitmen Siswa.';
  const splitClosing = doc.splitTextToSize(closingText, contentWidth);
  doc.text(splitClosing, margin, y);

  // Signatures at Bottom
  const sigY = 262;
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, sigY - 4, margin + contentWidth, sigY - 4);

  // Left Signature: Pengurus Karang Taruna
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Mengetahui,', margin + 25, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Pengurus Karang Taruna', margin + 25, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Kecamatan Tambora', margin + 25, sigY + 8, { align: 'center' });

  // Stamp Space
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 150, 165);
  doc.text('(Cap Stempel & Tanda Tangan)', margin + 25, sigY + 24, { align: 'center' });

  // Signer Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.line(margin + 5, sigY + 34, margin + 45, sigY + 34);
  doc.text('Ketua Rombel Karang Taruna', margin + 25, sigY + 38, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Kecamatan Tambora', margin + 25, sigY + 42, { align: 'center' });

  // Right Signature: Siswa (Materai 10.000)
  const rightX = margin + contentWidth - 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text(`Jakarta, ${todayFormatted}`, rightX, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Yang Membuat Pernyataan,', rightX, sigY + 4, { align: 'center' });

  // Materai Box
  const materaiW = 32;
  const materaiH = 18;
  const materaiX = rightX - materaiW / 2;
  const materaiY = sigY + 8;

  doc.setFillColor(255, 252, 235);
  doc.setDrawColor(200, 150, 50);
  doc.setLineWidth(0.35);
  doc.roundedRect(materaiX, materaiY, materaiW, materaiH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(160, 100, 20);
  doc.text('MATERAI TEMPEL', rightX, materaiY + 5, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text('Rp 10.000', rightX, materaiY + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text('(Tanda tangan sebagian)', rightX, materaiY + 14.5, { align: 'center' });

  // Student Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.line(rightX - 25, sigY + 34, rightX + 25, sigY + 34);
  doc.text(`(${profile.namaLengkap || 'Siswa'})`, rightX, sigY + 38, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`No. PDKT: ${cleanNopdkt}`, rightX, sigY + 42, { align: 'center' });

  // Footer: Filename & metadata
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.line(margin, 318, margin + contentWidth, 318);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(`Berkas: ${pdfFileName}`, margin, 322);
  doc.text('Rombongan Belajar Karang Taruna Kecamatan Tambora • Dokumen Resmi', margin + contentWidth, 322, {
    align: 'right',
  });

  return { doc, fileName: pdfFileName };
}

// Generates PDF as Base64 Data URI for direct automated upload to Google Drive
export function generateLetterPdfBase64(options: GeneratePdfOptions): { dataUri: string; base64: string; fileName: string } {
  const { doc, fileName } = createLetterPdfDoc(options);
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split('base64,')[1] || '';
  return { dataUri, base64, fileName };
}

// Downloads the F4 PDF directly to device
export function downloadLetterPdfF4(options: GeneratePdfOptions): string {
  const { doc, fileName } = createLetterPdfDoc(options);
  doc.save(fileName);
  return fileName;
}
