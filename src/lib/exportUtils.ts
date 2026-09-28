import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Siswa, AbsensiRecord, DailyReportSummary } from '../types';

// --- EXCEL EXPORTS ---

export function exportRecordsToExcel(filename: string, records: AbsensiRecord[], title: string = 'Laporan Absensi'): void {
  const data = records.map((r, i) => ({
    No: i + 1,
    Tanggal: r.tanggal,
    NISN: r.nisn,
    'Nama Siswa': r.nama,
    Kelas: r.kelas,
    'Jam Datang': r.jamDatang,
    'Jam Pulang': r.jamPulang,
    Keterangan: r.keterangan,
    Status: r.status
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Absensi');
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 15 }, // NISN
    { wch: 25 }, // Nama
    { wch: 10 }, // Kelas
    { wch: 12 }, // Jam Datang
    { wch: 12 }, // Jam Pulang
    { wch: 20 }, // Keterangan
    { wch: 12 }  // Status
  ];

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportDailyReportToExcel(summary: DailyReportSummary, studentDetails: AbsensiRecord[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan Eksekutif
  const summaryRows = [
    ['LAPORAN HARIAN KEHADIRAN SISWA'],
    ['Tanggal:', summary.tanggal],
    ['Tingkat Kehadiran:', `${summary.persentaseKehadiran}%`],
    ['Total Siswa:', summary.totalSiswa],
    ['Hadir:', summary.hadir],
    ['Sakit:', summary.sakit],
    ['Izin:', summary.izin],
    ['Alpa / Unrecorded:', summary.alpa],
    ['Terlambat:', summary.terlambatCount],
    ['Pulang Cepat:', summary.pulangCepatCount],
    ['Kelas Terbaik:', summary.topClass],
    ['Catatan Analisis:', summary.aiInsight],
    [''],
    ['RINGKASAN PER KELAS'],
    ['Kelas', 'Total Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'Persentase']
  ];

  summary.kelasSummary.forEach(ks => {
    summaryRows.push([
      ks.kelas,
      ks.total as any,
      ks.hadir as any,
      ks.sakit as any,
      ks.izin as any,
      ks.alpa as any,
      ks.terlambat as any,
      `${ks.persen}%`
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan Harian');

  // Sheet 2: Detail Siswa
  const detailRows = studentDetails.map((r, i) => ({
    No: i + 1,
    Tanggal: r.tanggal,
    NISN: r.nisn,
    'Nama Siswa': r.nama,
    Kelas: r.kelas,
    'Jam Datang': r.jamDatang,
    'Jam Pulang': r.jamPulang,
    Keterangan: r.keterangan,
    Status: r.status
  }));
  const ws2 = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail Siswa');

  XLSX.writeFile(wb, `Laporan_Harian_Absensi_${summary.tanggal}.xlsx`);
}

export function exportMonthlyMatrixToExcel(bulanLabel: string, yearStr: string, daysInMonth: number, studentsData: any[]): void {
  const wb = XLSX.utils.book_new();

  const headers = ['No', 'Nama Siswa', 'NISN', 'Kelas'];
  for (let d = 1; d <= daysInMonth; d++) {
    headers.push(String(d));
  }
  headers.push('Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpa (A)', 'Persentase (%)');

  const rows = [headers];

  studentsData.forEach((s, idx) => {
    const row = [idx + 1, s.nama, s.nisn, s.kelas];
    s.dailyCodes.forEach((d: any) => {
      row.push(d.code || '-');
    });
    row.push(s.stats.h, s.stats.s, s.stats.i, s.stats.a, `${s.stats.percent}%`);
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Bulanan');
  XLSX.writeFile(wb, `Rekap_Bulanan_${bulanLabel}_${yearStr}.xlsx`);
}

export function exportMonitoringToExcel(records: AbsensiRecord[], tanggal: string, kelas?: string): void {
  const data = records.map((r, i) => ({
    No: i + 1,
    Tanggal: r.tanggal,
    NISN: r.nisn,
    'Nama Siswa': r.nama,
    Kelas: r.kelas,
    'Jam Datang': r.jamDatang,
    'Jam Pulang': r.jamPulang,
    Keterangan: r.keterangan,
    Status: r.status
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring Realtime');
  XLSX.writeFile(workbook, `Monitoring_Absensi_${tanggal}${kelas ? '_' + kelas : ''}.xlsx`);
}

export function exportRekapBulananToExcel(kelas: string, bulan: string, matrixData: any[], daysInMonth: number): void {
  const wb = XLSX.utils.book_new();
  const headers = ['No', 'Nama Siswa', 'NISN', 'Kelas'];
  for (let d = 1; d <= daysInMonth; d++) {
    headers.push(String(d));
  }
  headers.push('Hadir', 'Sakit', 'Izin', 'Alpa');

  const rows = [headers];

  matrixData.forEach((row, idx) => {
    const r = [idx + 1, row.siswa.nama, row.siswa.nisn, row.siswa.kelas];
    for (let d = 1; d <= daysInMonth; d++) {
      r.push(row.dailyMap[d] || '-');
    }
    r.push(row.summary.hadir, row.summary.sakit, row.summary.izin, row.summary.alpa);
    rows.push(r);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, `Rekap Kelas ${kelas}`);
  XLSX.writeFile(wb, `Rekap_Bulanan_${kelas}_${bulan}.xlsx`);
}

export function exportPeriodReportToExcel(records: AbsensiRecord[], startDate: string, endDate: string, kelas?: string): void {
  const data = records.map((r, i) => ({
    No: i + 1,
    Tanggal: r.tanggal,
    NISN: r.nisn,
    'Nama Siswa': r.nama,
    Kelas: r.kelas,
    'Jam Datang': r.jamDatang,
    'Jam Pulang': r.jamPulang,
    Keterangan: r.keterangan,
    Status: r.status
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Periode');
  XLSX.writeFile(workbook, `Laporan_Periode_${startDate}_sd_${endDate}${kelas ? '_' + kelas : ''}.xlsx`);
}

export function downloadSiswaExcelTemplate(): void {
  const wb = XLSX.utils.book_new();
  const data = [
    ['NISN', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin (L/P)', 'Nomor HP Orang Tua'],
    ['1001234599', 'Budi Santoso', '10-A', 'L', '081234567890'],
    ['1001234598', 'Siti Rahmawati', '10-A', 'P', '081234567891']
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
  XLSX.writeFile(wb, 'Template_Import_Siswa.xlsx');
}

export function importSiswaFromExcel(file: File, callback: (siswaList: Siswa[]) => void): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      const parsed: Siswa[] = json.map((row, idx) => ({
        id: 'sw_imp_' + Date.now() + '_' + idx,
        nisn: String(row['NISN'] || row['nisn'] || '').trim(),
        nama: String(row['Nama Lengkap'] || row['Nama'] || row['nama'] || '').trim(),
        kelas: String(row['Kelas'] || row['kelas'] || '10-A').trim(),
        jenisKelamin: ((row['Jenis Kelamin (L/P)'] || row['JK'] || 'L').toString().toUpperCase().startsWith('P') ? 'Perempuan' : 'Laki-laki') as 'Laki-laki' | 'Perempuan',
        noHp: String(row['Nomor HP Orang Tua'] || row['HP'] || '').trim(),
        nomorHpOrangTua: String(row['Nomor HP Orang Tua'] || row['HP'] || '').trim(),
        qrCodeUrl: String(row['NISN'] || row['nisn'] || '').trim()
      })).filter(s => s.nisn && s.nama);

      callback(parsed);
    } catch (err) {
      console.error('Import excel error:', err);
      callback([]);
    }
  };
  reader.readAsArrayBuffer(file);
}

export function exportSiswaToExcel(siswaList: Siswa[]): void {
  const data = siswaList.map((s, i) => ({
    No: i + 1,
    NISN: s.nisn,
    'Nama Siswa': s.nama,
    Kelas: s.kelas,
    'Jenis Kelamin': s.jenisKelamin,
    'HP Orang Tua': s.nomorHpOrangTua || s.noHp || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
  XLSX.writeFile(workbook, `Data_Siswa_EAbsensi.xlsx`);
}

// --- PDF EXPORTS ---

export function exportDailyReportPDF(summary: DailyReportSummary, studentDetails: AbsensiRecord[]): void {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Header Letterhead
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('E-ABSENSI DIGITAL SEKOLAH', 15, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('LAPORAN HARIAN KEHADIRAN SISWA OTOMATIS', 15, 18);
  doc.text(`Tanggal: ${summary.tanggal}`, 195, 18, { align: 'right' });

  // Gold accent bar
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 28, 210, 2, 'F');

  // Executive Summary Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 35, 180, 40, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('RINGKASAN EKSEKUTIF HARI INI', 20, 43);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tingkat Kehadiran: ${summary.persentaseKehadiran}%`, 20, 50);
  doc.text(`Total Siswa: ${summary.totalSiswa}`, 20, 56);
  doc.text(`Hadir: ${summary.hadir}  |  Sakit: ${summary.sakit}  |  Izin: ${summary.izin}  |  Alpa: ${summary.alpa}`, 20, 62);
  doc.text(`Terlambat: ${summary.terlambatCount} siswa  |  Pulang Cepat: ${summary.pulangCepatCount} siswa`, 20, 68);

  // Analysis Box
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Analisis Otomatis: ${summary.aiInsight.substring(0, 110)}...`, 20, 72);

  // Class Summary Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('REKAPITULASI PER KELAS', 15, 83);

  doc.setFillColor(226, 232, 240);
  doc.rect(15, 87, 180, 7, 'F');

  doc.setFontSize(8);
  doc.text('Kelas', 20, 92);
  doc.text('Total', 60, 92, { align: 'center' });
  doc.text('Hadir', 85, 92, { align: 'center' });
  doc.text('Sakit', 110, 92, { align: 'center' });
  doc.text('Izin', 135, 92, { align: 'center' });
  doc.text('Alpa', 160, 92, { align: 'center' });
  doc.text('% Kehadiran', 185, 92, { align: 'center' });

  let y = 99;
  doc.setFont('helvetica', 'normal');
  summary.kelasSummary.forEach((ks, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 5, 180, 7, 'F');
    }
    doc.text(ks.kelas, 20, y);
    doc.text(String(ks.total), 60, y, { align: 'center' });
    doc.text(String(ks.hadir), 85, y, { align: 'center' });
    doc.text(String(ks.sakit), 110, y, { align: 'center' });
    doc.text(String(ks.izin), 135, y, { align: 'center' });
    doc.text(String(ks.alpa), 160, y, { align: 'center' });
    doc.text(`${ks.persen}%`, 185, y, { align: 'center' });
    y += 7;
  });

  // Student Detail Table
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DAFTAR DETAIL KEHADIRAN SISWA', 15, y);

  y += 4;
  doc.setFillColor(30, 41, 59);
  doc.rect(15, y, 180, 7, 'F');

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('No', 18, y + 5);
  doc.text('Nama Siswa', 30, y + 5);
  doc.text('Kelas', 95, y + 5);
  doc.text('Jam Datang', 120, y + 5);
  doc.text('Jam Pulang', 148, y + 5);
  doc.text('Status', 180, y + 5, { align: 'center' });

  y += 11;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');

  studentDetails.slice(0, 20).forEach((s, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(String(idx + 1), 18, y);
    doc.text(s.nama.substring(0, 28), 30, y);
    doc.text(s.kelas, 95, y);
    doc.text(s.jamDatang, 120, y);
    doc.text(s.jamPulang, 148, y);
    doc.text(s.status, 180, y, { align: 'center' });
    y += 6;
  });

  // Footer / Signatures
  if (y > 240) {
    doc.addPage();
    y = 30;
  } else {
    y += 15;
  }

  doc.setFontSize(9);
  doc.text(`Mengetahui,`, 140, y);
  doc.text(`Kepala Sekolah`, 140, y + 5);
  doc.text(`( Drs. H. Suwandi, M.Pd )`, 140, y + 28);

  doc.save(`Laporan_Harian_Resmi_${summary.tanggal}.pdf`);
}

export async function exportStudentCardsPDF(students: Siswa[]): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const cardW = 85;
  const cardH = 54;
  const gapX = 10;
  const gapY = 10;
  const marginX = 15;
  const marginY = 15;

  let col = 0;
  let row = 0;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const x = marginX + col * (cardW + gapX);
    const y = marginY + row * (cardH + gapY);

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'FD');

    // Header bar
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(x, y, cardW, 14, 3, 3, 'F');
    doc.rect(x, y + 10, cardW, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('KARTU PELAJAR DIGITAL', x + cardW / 2, y + 6, { align: 'center' });

    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text('SEKOLAH DIGITAL ACADEMY', x + cardW / 2, y + 10, { align: 'center' });

    // Gold line
    doc.setFillColor(245, 158, 11);
    doc.rect(x, y + 14, cardW, 1, 'F');

    // Generate QR Data URL
    try {
      const qrDataUrl = await QRCode.toDataURL(s.nisn, {
        width: 150,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      doc.addImage(qrDataUrl, 'PNG', x + 5, y + 18, 24, 24);
    } catch (err) {
      console.error('QR generation failed for student:', s.nisn);
    }

    // Student Info
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const namaTrunc = s.nama.length > 20 ? `${s.nama.substring(0, 18)}...` : s.nama;
    doc.text(namaTrunc, x + 33, y + 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`NISN: ${s.nisn}`, x + 33, y + 29);
    doc.text(`Kelas: ${s.kelas}`, x + 33, y + 34);
    doc.text(`JK: ${s.jenisKelamin}`, x + 33, y + 39);

    // Footer bar
    doc.setFillColor(241, 245, 249);
    doc.rect(x, y + 46, cardW, 8, 'F');
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text('Gunakan kartu ini untuk scan absensi harian siswa.', x + cardW / 2, y + 51, { align: 'center' });

    col++;
    if (col >= 2) {
      col = 0;
      row++;
      if (row >= 4 && i < students.length - 1) {
        doc.addPage();
        col = 0;
        row = 0;
      }
    }
  }

  doc.save('Kartu_Pelajar_Bulk.pdf');
}

// --- WHATSAPP REPORT GENERATION & SHARING ---

export function generateWhatsAppReportText(
  periodTitle: string,
  filterKelas: string,
  records: AbsensiRecord[],
  totalStudentsCount: number = 0
): string {
  const totalRecords = records.length;
  const hadir = records.filter(r => r.status === 'Hadir').length;
  const sakit = records.filter(r => r.status === 'Sakit').length;
  const izin = records.filter(r => r.status === 'Izin').length;
  const alpa = records.filter(r => r.status === 'Alpa' || r.status === 'Belum Absen').length;
  const terlambat = records.filter(r => r.status === 'Hadir' && r.keterangan?.toLowerCase().includes('terlambat')).length;

  const totalCalculated = hadir + sakit + izin + alpa;
  const percent = totalCalculated > 0 ? Math.round((hadir / totalCalculated) * 100) : 0;

  const absentStudents = records.filter(r => r.status !== 'Hadir' && r.status !== 'Belum Absen');

  let text = `*📊 LAPORAN KEHADIRAN SISWA E-ABSENSI*\n`;
  text += `*Periode:* ${periodTitle}\n`;
  text += `*Kelas:* ${filterKelas || 'Semua Kelas'}\n`;
  text += `-----------------------------------\n\n`;
  text += `*RINGKASAN REKAPITULASI:*\n`;
  text += `✅ *Hadir:* ${hadir} siswa\n`;
  text += `🏥 *Sakit:* ${sakit} siswa\n`;
  text += `🟡 *Izin:* ${izin} siswa\n`;
  text += `❌ *Alpa:* ${alpa} siswa\n`;
  if (terlambat > 0) text += `⏰ *Terlambat:* ${terlambat} siswa\n`;
  text += `📈 *Persentase Kehadiran:* ${percent}%\n\n`;

  if (absentStudents.length > 0) {
    text += `*DAFTAR KETIDAKHADIRAN / IZIN:*\n`;
    absentStudents.forEach((r, idx) => {
      const icon = r.status === 'Sakit' ? '🏥' : r.status === 'Izin' ? '🟡' : '❌';
      const reasonStr = r.alasan ? ` (${r.alasan})` : r.keterangan ? ` (${r.keterangan})` : '';
      text += `${idx + 1}. ${icon} *${r.nama}* [${r.kelas}] - ${r.status}${reasonStr}\n`;
    });
    text += `\n`;
  }

  text += `*Tanggal Cetak:* ${new Date().toLocaleString('id-ID')}\n`;
  text += `_Disampaikan otomatis oleh Sistem E-Absensi Sekolah_`;

  return text;
}

export function openWhatsAppWithText(text: string, phoneNumber: string = ''): void {
  const encoded = encodeURIComponent(text);
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  let url = `https://api.whatsapp.com/send?text=${encoded}`;
  if (cleanPhone) {
    url = `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  window.open(url, '_blank');
}

// --- MULTI-PERIOD EXCEL EXPORT ---

export function exportMultiPeriodExcel(
  periodLabel: string,
  filterKelasLabel: string,
  records: AbsensiRecord[]
): void {
  const wb = XLSX.utils.book_new();

  const hadir = records.filter(r => r.status === 'Hadir').length;
  const sakit = records.filter(r => r.status === 'Sakit').length;
  const izin = records.filter(r => r.status === 'Izin').length;
  const alpa = records.filter(r => r.status === 'Alpa' || r.status === 'Belum Absen').length;
  const total = records.length;
  const percent = total > 0 ? Math.round((hadir / total) * 100) : 0;

  const summaryHeader = [
    ['LAPORAN REKAPITULASI PRESENSI SISWA'],
    ['Periode Laporan:', periodLabel],
    ['Filter Kelas:', filterKelasLabel],
    ['Total Catatan:', total],
    ['Hadir:', hadir],
    ['Sakit:', sakit],
    ['Izin:', izin],
    ['Alpa / Tanpa Keterangan:', alpa],
    ['Persentase Kehadiran:', `${percent}%`],
    [''],
    ['DATA DETAIL KEHADIRAN SISWA'],
    ['No', 'Tanggal', 'NISN', 'Nama Siswa', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Status', 'Keterangan / Alasan', 'Bukti Foto']
  ];

  records.forEach((r, idx) => {
    summaryHeader.push([
      (idx + 1) as any,
      r.tanggal,
      r.nisn,
      r.nama,
      r.kelas,
      r.jamDatang || '-',
      r.jamPulang || '-',
      r.status,
      r.alasan || r.keterangan || '-',
      r.buktiFotoUrl ? 'Ada Foto' : '-'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(summaryHeader);
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Presensi');

  const filename = `Laporan_Presensi_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${filterKelasLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// --- MULTI-PERIOD PDF EXPORT ---

export function exportMultiPeriodPDF(
  periodLabel: string,
  filterKelasLabel: string,
  records: AbsensiRecord[]
): void {
  const doc = new jsPDF('p', 'mm', 'a4');

  doc.setFillColor(4, 120, 87); // Emerald 700
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('LAPORAN PRESENSI DIGITAL SEKOLAH', 15, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${periodLabel} | Kelas: ${filterKelasLabel}`, 15, 18);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 195, 18, { align: 'right' });

  doc.setFillColor(245, 158, 11);
  doc.rect(0, 28, 210, 2, 'F');

  const hadir = records.filter(r => r.status === 'Hadir').length;
  const sakit = records.filter(r => r.status === 'Sakit').length;
  const izin = records.filter(r => r.status === 'Izin').length;
  const alpa = records.filter(r => r.status === 'Alpa' || r.status === 'Belum Absen').length;
  const total = records.length;
  const percent = total > 0 ? Math.round((hadir / total) * 100) : 0;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 34, 180, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('REKAPITULASI SINGKAT', 20, 41);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Catatan: ${total}  |  Hadir: ${hadir}  |  Sakit: ${sakit}  |  Izin: ${izin}  |  Alpa: ${alpa}`, 20, 48);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tingkat Kehadiran: ${percent}%`, 20, 54);

  let y = 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('RINCIAN PRESENSI SISWA', 15, y);

  y += 4;
  doc.setFillColor(30, 41, 59);
  doc.rect(15, y, 180, 7, 'F');

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('No', 18, y + 5);
  doc.text('Tanggal', 28, y + 5);
  doc.text('Nama Siswa', 52, y + 5);
  doc.text('Kelas', 110, y + 5);
  doc.text('Status', 132, y + 5);
  doc.text('Keterangan / Alasan', 155, y + 5);

  y += 11;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');

  records.forEach((r, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(String(idx + 1), 18, y);
    doc.text(r.tanggal, 28, y);
    doc.text(r.nama.substring(0, 24), 52, y);
    doc.text(r.kelas, 110, y);
    doc.text(r.status, 132, y);
    doc.text((r.alasan || r.keterangan || '-').substring(0, 25), 155, y);
    y += 6;
  });

  if (y > 240) {
    doc.addPage();
    y = 30;
  } else {
    y += 12;
  }

  doc.setFontSize(9);
  doc.text(`Mengetahui,`, 140, y);
  doc.text(`Kepala Sekolah / Wali Kelas`, 140, y + 5);
  doc.text(`( _______________________ )`, 140, y + 26);

  const filename = `Laporan_Presensi_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
