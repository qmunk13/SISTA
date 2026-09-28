import React, { useState, useEffect } from 'react';
import { useSubTab } from '../utils/subTabHelper';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  AlertCircle,
  Sparkles,
  RefreshCw,
  Database,
  BarChart,
  Grid,
  Search,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { db } from '../data/db';
import { Siswa, Kelas } from '../types';
export default function Laporan() {
  const [activeSubTab, setActiveSubTab] = useSubTab<'dashboard' | 'ringkasan_bulanan' | 'siswa' | 'akademik' | 'keuangan' | 'bk' | 'inventaris'>('laporan', 'dashboard');
  const [exportTable, setExportTable] = useState('all_sheets');

  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAcademicSiswa, setSelectedAcademicSiswa] = useState<string>('');

  useEffect(() => {
    const loadReportData = () => {
      const list = db.get<Siswa>('siswa');
      setSiswaList(list);
      setKelasList(db.get<Kelas>('kelas'));
      if (list && list.length > 0 && !selectedAcademicSiswa) {
        setSelectedAcademicSiswa(list[0].id);
      }
    };

    loadReportData();
    window.addEventListener('erp-db-synced', loadReportData);
    return () => window.removeEventListener('erp-db-synced', loadReportData);
  }, []);

  const getKelasName = (kelasId: string) => {
    const k = kelasList.find((item) => item.id === kelasId);
    return k ? k.nama : kelasId;
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const applyProfessionalSchoolKop = (doc: jsPDF, orientation: 'portrait' | 'landscape') => {
    const pageWidth = orientation === 'portrait' ? 210 : 297;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('YAYASAN PENDIDIKAN ROMBEL KTCT TAMBORA', pageWidth / 2, 10, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('ROMBEL TAMBORA - SEKOLAH UNGGULAN TERPADU', pageWidth / 2, 14, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Izin Operasional No: 421.2/1892-PDK/2026 | NPSN: 69971234', pageWidth / 2, 18, { align: 'center' });
    doc.text('Alamat: Jl. Tambora No. 13, Tambora, Jakarta Barat 11120 - Telp: (021) 567890 | Web: www.rombelktct.sch.id', pageWidth / 2, 21, { align: 'center' });
    
    doc.setLineWidth(0.6);
    doc.setDrawColor(15, 23, 42);
    doc.line(14, 24, pageWidth - 14, 24);
    
    doc.setLineWidth(0.2);
    doc.line(14, 25, pageWidth - 14, 25);
  };

  const handleExport = (reportType: string, format: 'PDF' | 'EXCEL' | 'CSV') => {
    Swal.fire({
      title: 'Menyiapkan Ekspor...',
      text: `Mengekspor ${reportType} dalam format ${format}.`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    setTimeout(() => {
      try {
        if (format === 'CSV') {
          let csvContent = "";
          let filename = "";
          
          if (reportType === 'Log Kehadiran Siswa') {
            const list = db.get<any>('absensi') || [];
            const students = db.get<Siswa>('siswa') || [];
            const data = list.map((a: any, i: number) => {
              const student = students.find(s => s.id === a.siswaId);
              return [
                i + 1,
                a.tanggal || '',
                student ? student.nama : (a.siswaId || ''),
                student ? student.nisn : '',
                getKelasName(a.kelasId),
                a.jamDatang || '',
                a.jamPulang || '',
                a.status || '',
                a.keterangan || ''
              ];
            });
            const headers = ['No', 'Tanggal', 'Nama Siswa', 'NISN', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Status', 'Keterangan'];
            csvContent = [headers, ...data].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
            filename = "Laporan_Kehadiran_Siswa.csv";
            
          } else if (reportType === 'Statistik SPMB') {
            const list = db.get<any>('spmb_pendaftar') || [];
            const data = list.map((p: any, i: number) => [
              i + 1,
              p.kodePendaftaran || '',
              p.nama || '',
              p.nisn || '',
              p.nik || '',
              p.jk || '',
              p.status || '',
              p.noHp || '',
              p.tanggalDaftar || ''
            ]);
            const headers = ['No', 'No Pendaftaran', 'Nama Calon', 'NISN', 'NIK', 'JK', 'Status', 'No HP', 'Tanggal Daftar'];
            csvContent = [headers, ...data].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
            filename = "Laporan_Statistik_SPMB.csv";
            
          } else if (reportType === 'Jurnal Umum') {
            const pembayaranList = db.get<any>('pembayaran') || [];
            const pengeluaranList = db.get<any>('pengeluaran') || [];
            const students = db.get<Siswa>('siswa') || [];

            const entries: { tanggal: string; deskripsi: string; debit: number; kredit: number }[] = [];
            pembayaranList.forEach((p: any) => {
              const student = students.find(s => s.id === p.siswaId);
              entries.push({
                tanggal: p.tglBayar || p.tanggal || '2026-07-14',
                deskripsi: `Kas Masuk Pembayaran - ${student ? student.nama : p.siswaId || 'Siswa'} (${p.catatan || 'SPP'})`,
                debit: p.jumlah || p.nominal || 0,
                kredit: 0
              });
            });
            pengeluaranList.forEach((e: any) => {
              entries.push({
                tanggal: e.tanggal || '2026-07-14',
                deskripsi: `${e.deskripsi} (${e.kategori || 'Operasional'})`,
                debit: 0,
                kredit: e.nominal || 0
              });
            });
            entries.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

            const data = entries.map((item, idx) => [
              idx + 1,
              item.tanggal,
              item.deskripsi,
              item.debit,
              item.kredit
            ]);

            if (data.length === 0) {
              data.push([1, '-', 'KOSONG', 0, 0]);
            }

            const headers = ['No', 'Tanggal', 'Akun Rekening', 'Debit', 'Kredit'];
            csvContent = [headers, ...data].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
            filename = "Laporan_Jurnal_Umum.csv";
            
          } else if (reportType === 'Rekap Denda & Tabungan') {
            const list = db.get<any>('tabungan') || [];
            const students = db.get<Siswa>('siswa') || [];
            const data = list.map((t: any, i: number) => {
              const student = students.find(s => s.id === t.siswaId);
              return [
                i + 1,
                student ? student.nama : (t.siswaId || ''),
                t.tanggal || '',
                t.jenis || '',
                t.nominal || 0,
                t.saldoAfter || 0,
                t.catatan || '',
                t.createdBy || ''
              ];
            });
            const headers = ['No', 'Nama Siswa', 'Tanggal', 'Jenis', 'Nominal', 'Saldo Akhir', 'Catatan', 'Petugas'];
            csvContent = [headers, ...data].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
            filename = "Laporan_Rekap_Tabungan.csv";
          } else if (reportType === 'Rekap Tagihan Siswa') {
            const list = db.get<any>('tagihan') || [];
            const students = db.get<Siswa>('siswa') || [];
            const data = list.map((t: any, i: number) => {
              const student = students.find(s => s.id === t.siswaId);
              return [
                i + 1,
                student ? student.nama : (t.siswaId || ''),
                getKelasName(student ? student.kelasId : ''),
                t.namaTagihan || t.jenis || 'Tagihan Sekolah',
                t.nominal || 0,
                t.status || 'BELUM LUNAS',
                t.tanggalPembuatan || t.tanggal || ''
              ];
            });
            if (data.length === 0) {
              data.push([1, 'KOSONG', '-', '-', 0, '-', '-']);
            }
            const headers = ['No', 'Nama Siswa', 'Kelas', 'Nama Tagihan', 'Nominal', 'Status', 'Tanggal'];
            csvContent = [headers, ...data].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
            filename = "Laporan_Rekap_Tagihan.csv";
          } else {
            const headers = ['Status', 'Info'];
            csvContent = `Status,Info\n"Success","Laporan ${reportType} berhasil diekspor"`;
            filename = `Laporan_${reportType.replace(/\s+/g, '_')}.csv`;
          }
          
          const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", filename);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          Swal.close();
          Swal.fire('Sukses!', `${reportType} berhasil diunduh dalam format ${format}.`, 'success');
          return;
        }

        if (format === 'EXCEL') {
          const workbook = XLSX.utils.book_new();
          
          if (reportType === 'Log Kehadiran Siswa') {
            const list = db.get<any>('absensi') || [];
            const students = db.get<Siswa>('siswa') || [];
            const data = list.map((a: any, i: number) => {
              const student = students.find(s => s.id === a.siswaId);
              return {
                'No': i + 1,
                'Tanggal': a.tanggal || '',
                'Nama Siswa': student ? student.nama : (a.siswaId || ''),
                'NISN': student ? student.nisn : '',
                'Kelas': getKelasName(a.kelasId),
                'Jam Datang': a.jamDatang || '',
                'Jam Pulang': a.jamPulang || '',
                'Status': a.status || '',
                'Keterangan': a.keterangan || ''
              };
            });
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, ws, 'KEHADIRAN');
            XLSX.writeFile(workbook, `Laporan_Kehadiran_Siswa.xlsx`);

          } else if (reportType === 'Statistik SPMB') {
            const list = db.get<any>('spmb_pendaftar') || [];
            const data = list.map((p: any, i: number) => ({
              'No': i + 1,
              'No Pendaftaran': p.kodePendaftaran || '',
              'Nama Calon': p.nama || '',
              'NISN': p.nisn || '',
              'NIK': p.nik || '',
              'JK': p.jk || '',
              'Status': p.status || '',
              'No HP': p.noHp || '',
              'Tanggal Daftar': p.tanggalDaftar || ''
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, ws, 'SPMB_PENDAFTAR');
            XLSX.writeFile(workbook, `Laporan_Statistik_SPMB.xlsx`);

          } else if (reportType === 'Jurnal Umum') {
            const pembayaranList = db.get<any>('pembayaran') || [];
            const pengeluaranList = db.get<any>('pengeluaran') || [];
            const students = db.get<Siswa>('siswa') || [];

            const entries: { tanggal: string; deskripsi: string; debit: number; kredit: number }[] = [];
            pembayaranList.forEach((p: any) => {
              const student = students.find(s => s.id === p.siswaId);
              entries.push({
                tanggal: p.tglBayar || p.tanggal || '2026-07-14',
                deskripsi: `Kas Masuk Pembayaran - ${student ? student.nama : p.siswaId || 'Siswa'} (${p.catatan || 'SPP'})`,
                debit: p.jumlah || p.nominal || 0,
                kredit: 0
              });
            });
            pengeluaranList.forEach((e: any) => {
              entries.push({
                tanggal: e.tanggal || '2026-07-14',
                deskripsi: `${e.deskripsi} (${e.kategori || 'Operasional'})`,
                debit: 0,
                kredit: e.nominal || 0
              });
            });
            entries.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

            const data = entries.map((item, idx) => ({
              'No': idx + 1,
              'Tanggal': item.tanggal,
              'Akun Rekening': item.deskripsi,
              'Debit': item.debit,
              'Kredit': item.kredit
            }));

            if (data.length === 0) {
              data.push({ 'No': 1, 'Tanggal': '-', 'Akun Rekening': 'KOSONG', 'Debit': 0, 'Kredit': 0 });
            }

            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, ws, 'JURNAL_UMUM');
            XLSX.writeFile(workbook, `Laporan_Jurnal_Umum.xlsx`);

          } else if (reportType === 'Rekap Denda & Tabungan') {
            const list = db.get<any>('tabungan') || [];
            const students = db.get<Siswa>('siswa') || [];
            const data = list.map((t: any, i: number) => {
              const student = students.find(s => s.id === t.siswaId);
              return {
                'No': i + 1,
                'Nama Siswa': student ? student.nama : (t.siswaId || ''),
                'Tanggal Transaksi': t.tanggal || '',
                'Jenis': t.jenis || '',
                'Nominal': t.nominal || 0,
                'Saldo Akhir': t.saldoAfter || 0,
                'Catatan': t.catatan || '',
                'Petugas': t.createdBy || ''
              };
            });
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, ws, 'TABUNGAN');
            XLSX.writeFile(workbook, `Laporan_Rekap_Tabungan.xlsx`);
          } else if (reportType === 'Rekap Tagihan Siswa') {
            const list = db.get<any>('tagihan') || [];
            const students = db.get<Siswa>('siswa') || [];
            const data = list.map((t: any, i: number) => {
              const student = students.find(s => s.id === t.siswaId);
              return {
                'No': i + 1,
                'Nama Siswa': student ? student.nama : (t.siswaId || ''),
                'Kelas': getKelasName(student ? student.kelasId : ''),
                'Nama Tagihan': t.namaTagihan || t.jenis || 'Tagihan Sekolah',
                'Nominal': t.nominal || 0,
                'Status': t.status || 'BELUM LUNAS',
                'Tanggal': t.tanggalPembuatan || t.tanggal || ''
              };
            });
            if (data.length === 0) {
              data.push({ 'No': 1, 'Nama Siswa': 'KOSONG', 'Kelas': '-', 'Nama Tagihan': '-', 'Nominal': 0, 'Status': '-', 'Tanggal': '-' });
            }
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, ws, 'REKAP_TAGIHAN');
            XLSX.writeFile(workbook, `Laporan_Rekap_Tagihan.xlsx`);
          } else {
            const dummy = [{ 'Info': 'Laporan offline berhasil diekspor', 'Tipe': reportType }];
            const ws = XLSX.utils.json_to_sheet(dummy);
            XLSX.utils.book_append_sheet(workbook, ws, 'LAPORAN');
            XLSX.writeFile(workbook, `Laporan_${reportType.replace(/\s+/g, '_')}.xlsx`);
          }

        } else if (format === 'PDF') {
          const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
          });

          applyProfessionalSchoolKop(doc, 'landscape');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(`LAPORAN OPERASIONAL: ${reportType.toUpperCase()}`, 14, 33);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 14, 37);

          if (reportType === 'Rapor Hasil Belajar') {
            const reportDoc = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4'
            });

            const students = db.get<Siswa>('siswa') || [];
            const student = students.find(s => s.id === selectedAcademicSiswa) || students[0] || { id: '', nama: 'Siswa', nisn: '-', kelasId: '-' };

            applyProfessionalSchoolKop(reportDoc, 'portrait');
            reportDoc.setFont('helvetica', 'bold');
            reportDoc.setFontSize(11);
            reportDoc.setTextColor(15, 23, 42);
            reportDoc.text('LAPORAN HASIL EVALUASI BELAJAR SISWA (RAPOR)', 105, 33, { align: 'center' });

            reportDoc.setFont('helvetica', 'bold');
            reportDoc.setFontSize(9);
            reportDoc.text('NAMA SISWA :', 15, 41);
            reportDoc.text('NOMOR INDUK (NISN) :', 15, 46);
            reportDoc.text('KELAS / JENJANG :', 15, 51);

            reportDoc.setFont('helvetica', 'normal');
            reportDoc.text(student.nama.toUpperCase(), 60, 41);
            reportDoc.text(student.nisn || '2024001', 60, 46);
            
            const kelasName = getKelasName(student.kelasId);
            const isPaketA = kelasName.toUpperCase().includes('PAKET A') || ['4', '5', '6'].includes(student.kelasId);
            const levelDesc = isPaketA ? `${kelasName} / SD (Tingkat Sekolah Dasar)` : `${kelasName} / SMA (Tingkat Menengah Atas)`;
            reportDoc.text(levelDesc, 60, 51);

            reportDoc.setFont('helvetica', 'bold');
            reportDoc.text('TAHUN AJARAN :', 125, 41);
            reportDoc.text('SEMESTER :', 125, 46);
            reportDoc.text('STATUS :', 125, 51);

            reportDoc.setFont('helvetica', 'normal');
            reportDoc.text('2026/2027', 160, 41);
            reportDoc.text('1 (GANJIL)', 160, 46);
            reportDoc.text('AKTIF / LULUS', 160, 51);

            const headers = [['No', 'Mata Pelajaran / Modul', 'Sandi', 'KKM', 'Nilai Angka', 'Predikat', 'Deskripsi Capaian Kompetensi']];
            
            const hasilUjian = db.get<any>('hasil_ujian') || [];
            const studentExams = hasilUjian.filter((h: any) => h.siswaId === student.id || h.nisn === student.nisn);
            
            let scoresData = [];
            if (studentExams.length > 0) {
              scoresData = studentExams.map((h: any, idx: number) => {
                const score = h.nilaiAkhir ?? h.nilai ?? 80;
                let pred = 'C';
                let desc = 'Perlu bimbingan intensif dalam pemahaman konsep utama.';
                if (score >= 90) {
                  pred = 'A';
                  desc = 'Menunjukkan penguasaan kompetensi yang sangat luar biasa dan mandiri.';
                } else if (score >= 80) {
                  pred = 'B+';
                  desc = 'Menunjukkan penguasaan materi yang baik dan tuntas pada modul pembelajaran.';
                } else if (score >= 75) {
                  pred = 'B';
                  desc = 'Telah mencapai ketuntasan minimum kompetensi dasar dengan baik.';
                }
                return [
                  idx + 1,
                  h.namaUjian || h.judul || 'Ujian Evaluasi CBT',
                  h.idUjian || 'CBT_ID',
                  75,
                  score,
                  pred,
                  desc
                ];
              });
            } else {
              scoresData = isPaketA ? [
                [1, 'Pendidikan Agama Islam', 'A4-PAI', 75, 86, 'A-', 'Sangat baik dalam memahami pilar keimanan dan akhlak mulia.'],
                [2, 'Pendidikan Pancasila', 'A4-PPKN', 75, 82, 'B+', 'Sangat kompeten dalam memahami hak kewajiban warga negara.'],
                [3, 'Bahasa Indonesia', 'A4-BINDO', 75, 84, 'B+', 'Sangat baik dalam menyusun teks ulasan dan pantun daerah.'],
                [4, 'Matematika', 'A4-MTK', 75, 78, 'B', 'Tuntas dalam memahami operasi pecahan dan volume bangun ruang.'],
                [5, 'Karang Taruna / Prakarya', 'KATAR', 75, 88, 'A-', 'Sangat terampil dalam pembuatan prakarya daur ulang kreatif.']
              ] : [
                [1, 'Fisika Peminatan', 'MP_FIS', 75, 85, 'A-', 'Sangat baik dalam memahami materi Mekanika Kuantum & Relativitas.'],
                [2, 'Matematika Wajib', 'MP_MAT', 75, 88, 'A', 'Sangat terampil dalam memecahkan persamaan Diferensial & Kalkulus.'],
                [3, 'Kimia Terapan', 'MP_KIM', 75, 80, 'B+', 'Sangat kompeten dalam praktikum Stoikiometri & Struktur Atom.'],
                [4, 'Biologi Seluler', 'MP_BIO', 75, 84, 'A-', 'Sangat baik dalam materi Genetika & Klasifikasi Makhluk Hidup.'],
                [5, 'Karang Taruna / Prakarya', 'KATAR', 75, 90, 'A', 'Aktif dan inovatif dalam memimpin kegiatan baksos kemasyarakatan.']
              ];
            }

            autoTable(reportDoc, {
              startY: 56,
              head: headers,
              body: scoresData,
              theme: 'grid',
              styles: { fontSize: 8, font: 'helvetica' },
              headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
              columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 35 },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 12, halign: 'center' },
                4: { cellWidth: 18, halign: 'center' },
                5: { cellWidth: 15, halign: 'center' },
                6: { cellWidth: 75 }
              }
            });

            const finalY = (reportDoc as any).lastAutoTable.finalY + 15;
            reportDoc.setFontSize(9);
            reportDoc.text('Orang Tua / Wali Siswa,', 25, finalY);
            reportDoc.text('_______________________', 25, finalY + 22);

            reportDoc.text('Wali Kelas,', 90, finalY);
            reportDoc.text('Bu Rahma', 90, finalY + 22);
            reportDoc.text('NIP. 19890112 201201 2 002', 90, finalY + 26);

            reportDoc.text('Kepala Sekolah,', 150, finalY);
            reportDoc.text('Dr. H. Ahmad Sudrajat', 150, finalY + 22);
            reportDoc.text('NIP. 19780512 200212 1 001', 150, finalY + 26);

            reportDoc.save(`Rapor_Hasil_Belajar_${student.nama.replace(/\s+/g, '_')}.pdf`);

          } else if (reportType === 'Log Kehadiran Siswa') {
            const list = db.get<any>('absensi') || [];
            const students = db.get<Siswa>('siswa') || [];
            const headers = [['No', 'Tanggal', 'Nama Siswa', 'NISN', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Status', 'Keterangan']];
            const tableData = list.map((a: any, i: number) => {
              const student = students.find(s => s.id === a.siswaId);
              return [
                i + 1,
                a.tanggal || '',
                student ? student.nama : (a.siswaId || ''),
                student ? student.nisn : '',
                getKelasName(a.kelasId),
                a.jamDatang || '',
                a.jamPulang || '',
                a.status || '',
                a.keterangan || ''
              ];
            });

            autoTable(doc, {
              startY: 42,
              head: headers,
              body: tableData,
              theme: 'grid',
              styles: { fontSize: 8, font: 'helvetica' },
              headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' }
            });
            doc.save('Laporan_Kehadiran_Siswa.pdf');

          } else if (reportType === 'Statistik SPMB') {
            const list = db.get<any>('spmb_pendaftar') || [];
            const headers = [['No', 'No Pendaftaran', 'Nama Calon', 'NISN', 'NIK', 'JK', 'Status', 'No HP', 'Tanggal Daftar']];
            const tableData = list.map((p: any, i: number) => [
              i + 1,
              p.kodePendaftaran || '',
              p.nama || '',
              p.nisn || '',
              p.nik || '',
              p.jk || '',
              p.status || '',
              p.noHp || '',
              p.tanggalDaftar || ''
            ]);

            autoTable(doc, {
              startY: 42,
              head: headers,
              body: tableData,
              theme: 'grid',
              styles: { fontSize: 8, font: 'helvetica' },
              headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' }
            });
            doc.save('Laporan_Statistik_SPMB.pdf');

          } else if (reportType === 'Jurnal Umum') {
            const pembayaranList = db.get<any>('pembayaran') || [];
            const pengeluaranList = db.get<any>('pengeluaran') || [];
            const students = db.get<Siswa>('siswa') || [];

            const entries: { tanggal: string; deskripsi: string; debit: number; kredit: number }[] = [];
            pembayaranList.forEach((p: any) => {
              const student = students.find(s => s.id === p.siswaId);
              entries.push({
                tanggal: p.tglBayar || p.tanggal || '2026-07-14',
                deskripsi: `Kas Masuk Pembayaran - ${student ? student.nama : p.siswaId || 'Siswa'} (${p.catatan || 'SPP'})`,
                debit: p.jumlah || p.nominal || 0,
                kredit: 0
              });
            });
            pengeluaranList.forEach((e: any) => {
              entries.push({
                tanggal: e.tanggal || '2026-07-14',
                deskripsi: `${e.deskripsi} (${e.kategori || 'Operasional'})`,
                debit: 0,
                kredit: e.nominal || 0
              });
            });
            entries.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

            const headers = [['No', 'Tanggal', 'Akun / Rekening Rekonsiliasi', 'Debit (Kas Masuk)', 'Kredit (Kas Keluar)']];
            const tableData = entries.map((item, idx) => [
              idx + 1,
              item.tanggal,
              item.deskripsi,
              item.debit > 0 ? formatRupiah(item.debit) : '-',
              item.kredit > 0 ? formatRupiah(item.kredit) : '-'
            ]);

            if (tableData.length === 0) {
              tableData.push([1, '-', 'KOSONG', '0', '0']);
            }

            autoTable(doc, {
              startY: 42,
              head: headers,
              body: tableData,
              theme: 'grid',
              styles: { fontSize: 8, font: 'helvetica' },
              headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' }
            });
            doc.save('Laporan_Jurnal_Umum.pdf');

          } else if (reportType === 'Rekap Denda & Tabungan') {
            const list = db.get<any>('tabungan') || [];
            const students = db.get<Siswa>('siswa') || [];
            const headers = [['No', 'Nama Siswa', 'Tanggal', 'Jenis', 'Nominal', 'Saldo Akhir', 'Catatan', 'Petugas']];
            const tableData = list.map((t: any, i: number) => {
              const student = students.find(s => s.id === t.siswaId);
              return [
                i + 1,
                student ? student.nama : (t.siswaId || ''),
                t.tanggal || '',
                t.jenis || '',
                formatRupiah(t.nominal || 0),
                formatRupiah(t.saldoAfter || 0),
                t.catatan || '',
                t.createdBy || ''
              ];
            });

            autoTable(doc, {
              startY: 42,
              head: headers,
              body: tableData,
              theme: 'grid',
              styles: { fontSize: 8, font: 'helvetica' },
              headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' }
            });
            doc.save('Laporan_Rekap_Tabungan.pdf');

          } else if (reportType === 'Rekap Tagihan Siswa') {
            const list = db.get<any>('tagihan') || [];
            const students = db.get<Siswa>('siswa') || [];
            const headers = [['No', 'Nama Siswa', 'Kelas', 'Nama Tagihan', 'Nominal', 'Status', 'Tanggal']];
            const tableData = list.map((t: any, i: number) => {
              const student = students.find(s => s.id === t.siswaId);
              return [
                i + 1,
                student ? student.nama : (t.siswaId || ''),
                getKelasName(student ? student.kelasId : ''),
                t.namaTagihan || t.jenis || 'Tagihan Sekolah',
                formatRupiah(t.nominal || 0),
                t.status || 'BELUM LUNAS',
                t.tanggalPembuatan || t.tanggal || ''
              ];
            });
            if (tableData.length === 0) {
              tableData.push([1, 'KOSONG', '-', '-', '0', '-', '-']);
            }
            autoTable(doc, {
              startY: 42,
              head: headers,
              body: tableData,
              theme: 'grid',
              styles: { fontSize: 8, font: 'helvetica' },
              headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' }
            });
            doc.save('Laporan_Rekap_Tagihan.pdf');
          }
        }

        Swal.close();
        Swal.fire('Sukses!', `${reportType} berhasil diunduh dalam format ${format}.`, 'success');
      } catch (err) {
        console.error(err);
        Swal.close();
        Swal.fire('Error', 'Gagal memproses pembuatan berkas ekspor offline.', 'error');
      }
    }, 1000);
  };

  const handleRealDatabaseExport = (targetTable: string) => {
    Swal.fire({
      title: 'Menyiapkan Ekspor...',
      text: `Sedang memproses ekspor tabel "${targetTable.toUpperCase()}" ke Excel...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    setTimeout(() => {
      try {
        const workbook = XLSX.utils.book_new();

        const getOrangTuaSheetData = () => {
          const students = db.get<Siswa>('siswa') || [];
          const pendaftarList = db.get<any>('spmb_pendaftar') || [];
          const orangTuaData: any[] = [];
          const seenParents = new Set<string>();

          students.forEach((s, i) => {
            const pdkt = s.noPdkt || `PDKT2026-0${i + 1}`;
            if (s.namaAyah && !seenParents.has(s.namaAyah)) {
              seenParents.add(s.namaAyah);
              orangTuaData.push({
                'OrtuID': `ORT_AYH_${s.id.split('_')[1] || i}`,
                'No. PDKT': pdkt,
                'Nama': s.namaAyah,
                'Hubungan': 'Ayah',
                'NoHP': s.tlpAyah || s.noHp || '08123456789'
              });
            }
            if (s.namaIbu && !seenParents.has(s.namaIbu)) {
              seenParents.add(s.namaIbu);
              orangTuaData.push({
                'OrtuID': `ORT_IBU_${s.id.split('_')[1] || i}`,
                'No. PDKT': pdkt,
                'Nama': s.namaIbu,
                'Hubungan': 'Ibu',
                'NoHP': s.tlpIbu || s.noHp || '08123456789'
              });
            }
            if (s.namaWali && !seenParents.has(s.namaWali)) {
              seenParents.add(s.namaWali);
              orangTuaData.push({
                'OrtuID': `ORT_WAL_${s.id.split('_')[1] || i}`,
                'No. PDKT': pdkt,
                'Nama': s.namaWali,
                'Hubungan': s.hubunganWali || 'Wali',
                'NoHP': s.tlpWali || s.noHp || '08123456789'
              });
            }
          });

          pendaftarList.forEach((p: any, i: number) => {
            const pdkt = p.kodePendaftaran || `PDKT2026-P0${i + 1}`;
            if (p.namaAyah && !seenParents.has(p.namaAyah)) {
              seenParents.add(p.namaAyah);
              orangTuaData.push({
                'OrtuID': `ORT_AYH_P_${i}`,
                'No. PDKT': pdkt,
                'Nama': p.namaAyah,
                'Hubungan': 'Ayah',
                'NoHP': p.noHp || '08123456789'
              });
            }
            if (p.namaIbu && !seenParents.has(p.namaIbu)) {
              seenParents.add(p.namaIbu);
              orangTuaData.push({
                'OrtuID': `ORT_IBU_P_${i}`,
                'No. PDKT': pdkt,
                'Nama': p.namaIbu,
                'Hubungan': 'Ibu',
                'NoHP': p.noHp || '08123456789'
              });
            }
          });

          if (orangTuaData.length === 0) {
            orangTuaData.push({
              'OrtuID': 'ORT_001',
              'No. PDKT': 'PDKT2026-001',
              'Nama': 'Siti Aminah',
              'Hubungan': 'Ibu',
              'NoHP': '08123456789'
            });
          }
          return orangTuaData;
        };

        const getKelasSheetData = () => {
          const list = db.get<Kelas>('kelas') || [];
          return list.map(k => {
            const tingkatNum = parseInt(k.id) || 12;
            const jenjangID = tingkatNum <= 6 ? 'SD' : (tingkatNum <= 9 ? 'SMP' : 'SMA');
            
            let waliKelasID = `GUR_WK_${k.id}`;
            if (k.wali === 'Pak Joko' || k.wali?.includes('Joko')) waliKelasID = 'GUR_101';
            else if (k.wali === 'Bu Sri' || k.wali?.includes('Sri')) waliKelasID = 'GUR_102';
            else if (k.wali === 'Bu Rahma' || k.wali?.includes('Rahma')) waliKelasID = 'USR_wk1';
            
            return {
              'KelasID': `KLS_${k.id}`,
              'NamaKelas': k.nama,
              'JenjangID': jenjangID,
              'Tingkat': tingkatNum,
              'WaliKelasID': waliKelasID
            };
          });
        };

        const getJenjangSheetData = () => {
          return [
            { 'JenjangID': 'SD', 'NamaJenjang': 'Sekolah Dasar', 'Kode': 'SD' },
            { 'JenjangID': 'SMP', 'NamaJenjang': 'Sekolah Menengah Pertama', 'Kode': 'SMP' },
            { 'JenjangID': 'SMA', 'NamaJenjang': 'Sekolah Menengah Atas', 'Kode': 'SMA' }
          ];
        };

        const getMapelSheetData = () => {
          const list = db.get<any>('mapel') || [];
          return list.map((m: any, idx: number) => {
            let kode = m.id.includes('_') ? m.id.split('_')[1] : m.id;
            let guruId = 'GUR_101';
            if (m.nama?.toLowerCase().includes('matematika')) {
              guruId = 'GUR_102';
            } else if (idx === 2) {
              guruId = 'GUR_101';
            } else {
              guruId = `GUR_WK_${idx + 1}`;
            }
            return {
              'MapelID': m.id,
              'Kode': kode,
              'NamaMapel': m.nama,
              'KKM': m.kkm || 75,
              'GuruID': guruId
            };
          });
        };

        const getTahunAjaranSheetData = () => {
          return [
            { 'TAID': 'TA_2024', 'Nama': '2024/2025', 'Aktif': 'Tidak' },
            { 'TAID': 'TA_2025', 'Nama': '2025/2026', 'Aktif': 'Tidak' },
            { 'TAID': 'TA_2026', 'Nama': '2026/2027', 'Aktif': 'Ya' }
          ];
        };

        const getSemesterSheetData = () => {
          return [
            { 'SemesterID': 'SEM_1', 'Nama': 'Ganjil', 'Aktif': 'Tidak' },
            { 'SemesterID': 'SEM_2', 'Nama': 'Genap', 'Aktif': 'Ya' }
          ];
        };

        const getSiswaSheetData = () => {
          const list = db.get<any>('siswa') || [];
          return list.map((s: any, i: number) => ({
            'No': i + 1,
            'SiswaID': s.id || '',
            'NISN': s.nisn || '',
            'Nama Lengkap': s.nama || '',
            'Tempat Lahir': s.tempatLahir || '',
            'Tanggal Lahir': s.tglLahir || '',
            'NIK': s.nik || '',
            'Kelas': getKelasName(s.kelasId),
            'No HP': s.noHp || '',
            'Status': s.status || '',
            'Nama Ayah': s.namaAyah || '',
            'Nama Ibu': s.namaIbu || ''
          }));
        };

        const getGuruSheetData = () => {
          const list = db.get<any>('guru') || [];
          return list.map((g: any, i: number) => ({
            'No': i + 1,
            'ID': g.id || '',
            'NIP': g.nip || '',
            'Nama Guru': g.nama || '',
            'Mapel': g.mapel || '',
            'Kelas Ajar': g.kelasAjar || '',
            'JK': g.jk || '',
            'NIK': g.nik || '',
            'No HP': g.noHp || '',
            'Email': g.email || '',
            'Status': g.status || 'AKTIF'
          }));
        };

        const getTagihanSheetData = () => {
          const list = db.get<any>('TAGIHAN') || db.get<any>('tagihan') || [];
          return list.map((t: any, i: number) => ({
            'No': i + 1,
            'TagihanID': t.tagihanId || t.id || '',
            'nopdkt': t.nopdkt || t.siswaId || '',
            'NamaSiswa': t.namaSiswa || t.nama || '',
            'Kelas': t.kelasNama || t.kelasId || '',
            'KodeBiaya': t.kodeBiaya || t.biayaId || '',
            'NamaBiaya': t.namaBiaya || t.posBiaya || '',
            'TahunAjaran': t.tahunAjaranId || t.tahunAjaran || '2023/2024',
            'Semester': t.semesterId || t.semester || 'Ganjil',
            'TanggalTagihan': t.tanggalTagihan || t.createdAt?.slice(0, 10) || '',
            'JatuhTempo': t.jatuhTempo || t.tanggalJatuhTempo || '',
            'Nominal': t.nominalAsli || t.nominal || t.jumlah || 0,
            'Diskon': t.diskon || 0,
            'TotalTagihan': t.totalTagihan || t.nominalAsli || t.nominal || t.jumlah || 0,
            'TanggalBayar': t.tanggalBayar || t.paidAt || '',
            'TotalBayar': t.totalBayar || t.paidAmount || t.terbayar || 0,
            'SisaTagihan': t.sisaTagihan ?? Math.max(0, (t.totalTagihan || t.nominal || t.jumlah || 0) - (t.totalBayar || t.paidAmount || t.terbayar || 0)),
            'Status': t.status || 'BELUM',
            'Keterangan': t.keterangan || '-'
          }));
        };

        const getHasilUjianSheetData = () => {
          const list = db.get<any>('hasil_ujian') || [];
          return list.map((h: any, i: number) => ({
            'No': i + 1,
            'ID': h.id || '',
            'UjianID': h.idUjian || '',
            'Nama Siswa': h.namaSiswa || '',
            'Mapel': h.mapel || '',
            'Kelas': h.kelas || '',
            'Nilai Akhir': h.nilaiAkhir || 0,
            'Status': h.status || 'SELESAI'
          }));
        };

        const getSpmbPendaftarSheetData = () => {
          const list = db.get<any>('spmb_pendaftar') || [];
          return list.map((p: any, i: number) => ({
            'No': i + 1,
            'Kode Pendaftaran': p.kodePendaftaran || p.id || '',
            'Nama Lengkap': p.nama || '',
            'NISN': p.nisn || '',
            'Gelombang': p.gelombang || '',
            'Jalur': p.jalur || '',
            'Status': p.status || 'Menunggu',
            'Tanggal Daftar': p.tglDaftar || ''
          }));
        };

        const getGenericSheetData = (key: string) => {
          const list = db.get<any>(key) || [];
          return list.length > 0 ? list : [{ Info: `Tabel ${key} Kosong` }];
        };

        if (targetTable === 'all_sheets' || targetTable === 'all' || targetTable === 'semua') {
          // Export ALL database sheets together in 1 Excel file
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getOrangTuaSheetData()), 'ORANG_TUA');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getKelasSheetData()), 'KELAS');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getJenjangSheetData()), 'JENJANG');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getMapelSheetData()), 'MAPEL');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getTahunAjaranSheetData()), 'TAHUN_AJARAN');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getSemesterSheetData()), 'SEMESTER');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getSiswaSheetData()), 'SISWA');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getGuruSheetData()), 'GURU');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getTagihanSheetData()), 'TAGIHAN');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getHasilUjianSheetData()), 'HASIL_UJIAN');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getSpmbPendaftarSheetData()), 'SPMB_PENDAFTAR');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getGenericSheetData('presensi')), 'PRESENSI');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getGenericSheetData('kas_sekolah')), 'KAS_SEKOLAH');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getGenericSheetData('tabungan')), 'TABUNGAN');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getGenericSheetData('pelanggaran')), 'PELANGGARAN');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getGenericSheetData('bimbingan')), 'BIMBINGAN');
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(getGenericSheetData('barang')), 'BARANG');

          XLSX.writeFile(workbook, `Sisko_ERP_Full_Database_SEMUANYA.xlsx`);
        } else if (targetTable === 'orang_tua' || targetTable === 'ortu') {
          const data = getOrangTuaSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'ORANG_TUA');
          XLSX.writeFile(workbook, `Sisko_ERP_Sheet_ORANG_TUA.xlsx`);
        } else if (targetTable === 'kelas') {
          const data = getKelasSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'KELAS');
          XLSX.writeFile(workbook, `Sisko_ERP_Sheet_KELAS.xlsx`);
        } else if (targetTable === 'jenjang') {
          const data = getJenjangSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'JENJANG');
          XLSX.writeFile(workbook, `Sisko_ERP_Sheet_Jenjang.xlsx`);
        } else if (targetTable === 'mapel') {
          const data = getMapelSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'MAPEL');
          XLSX.writeFile(workbook, `Sisko_ERP_Sheet_MAPEL.xlsx`);
        } else if (targetTable === 'tahun_ajaran' || targetTable === 'ta') {
          const data = getTahunAjaranSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'TAHUN_AJARAN');
          XLSX.writeFile(workbook, `Sisko_ERP_Sheet_TAHUN_AJARAN.xlsx`);
        } else if (targetTable === 'semester') {
          const data = getSemesterSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'SEMESTER');
          XLSX.writeFile(workbook, `Sisko_ERP_Sheet_SEMESTER.xlsx`);
        } else if (targetTable === 'siswa') {
          const data = getSiswaSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'SISWA');
          XLSX.writeFile(workbook, `Sisko_ERP_Tabel_SISWA.xlsx`);
        } else if (targetTable === 'guru') {
          const data = getGuruSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'GURU');
          XLSX.writeFile(workbook, `Sisko_ERP_Tabel_GURU.xlsx`);
        } else if (targetTable === 'tagihan') {
          const data = getTagihanSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'TAGIHAN');
          XLSX.writeFile(workbook, `Sisko_ERP_Tabel_TAGIHAN.xlsx`);
        } else if (targetTable === 'hasil_ujian') {
          const data = getHasilUjianSheetData();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, 'HASIL_UJIAN');
          XLSX.writeFile(workbook, `Sisko_ERP_Tabel_HASIL_UJIAN.xlsx`);
        } else {
          const list = db.get<any>(targetTable) || [];
          const data = list.length > 0 ? list : [{ Info: `Tabel ${targetTable} Kosong` }];
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, ws, targetTable.toUpperCase());
          XLSX.writeFile(workbook, `Sisko_ERP_Tabel_${targetTable.toUpperCase()}.xlsx`);
        }

        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Ekspor Berhasil!',
          text: `Spreadsheet Excel untuk tabel "${targetTable.toUpperCase()}" berhasil diunduh.`,
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err) {
        console.error(err);
        Swal.close();
        Swal.fire('Error', 'Gagal memproses ekspor data mentah ke Excel.', 'error');
      }
    }, 800);
  };

  const exportToExcel = (data: Siswa[], fileName: string) => {
    try {
      const formattedData = data.map((s, index) => ({
        'No': index + 1,
        'NISN': s.nisn || '',
        'Nama Lengkap': s.nama || '',
        'Tempat Lahir': s.tempatLahir || '',
        'Tanggal Lahir': s.tglLahir || '',
        'NIK': s.nik || '',
        'Kelas': getKelasName(s.kelasId),
        'No HP': s.noHp || '',
        'Status': s.status || '',
        'Nama Ibu': s.namaIbu || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Data Siswa');
      
      // Set reasonable column widths
      worksheet['!cols'] = [
        { wch: 6 },   // No
        { wch: 15 },  // NISN
        { wch: 25 },  // Nama Lengkap
        { wch: 18 },  // Tempat Lahir
        { wch: 15 },  // Tanggal Lahir
        { wch: 20 },  // NIK
        { wch: 12 },  // Kelas
        { wch: 15 },  // No HP
        { wch: 12 },  // Status
        { wch: 20 }   // Nama Ibu
      ];

      XLSX.writeFile(workbook, `${fileName}.xlsx`);
      Swal.fire('Sukses!', 'Berkas Excel (.xlsx) berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal mengekspor data ke Excel.', 'error');
    }
  };

  const exportToPDF = (data: Siswa[], title: string, fileName: string) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      applyProfessionalSchoolKop(doc, 'landscape');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`LAPORAN REGISTER DATA SISWA: ${title.toUpperCase()}`, 14, 33);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 14, 37);

      const headers = [[
        'No', 
        'NISN', 
        'Nama Lengkap', 
        'Tempat Lahir', 
        'Tanggal Lahir', 
        'NIK', 
        'Kelas', 
        'No HP', 
        'Status', 
        'Nama Ibu'
      ]];

      const tableData = data.map((s, index) => [
        index + 1,
        s.nisn || '',
        s.nama || '',
        s.tempatLahir || '',
        s.tglLahir || '',
        s.nik || '',
        getKelasName(s.kelasId),
        s.noHp || '',
        s.status || '',
        s.namaIbu || ''
      ]);

      autoTable(doc, {
        startY: 42,
        head: headers,
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 10 },  // No
          1: { cellWidth: 22 },  // NISN
          2: { cellWidth: 45 },  // Nama Lengkap
          3: { cellWidth: 25 },  // Tempat Lahir
          4: { cellWidth: 22 },  // Tanggal Lahir
          5: { cellWidth: 32 },  // NIK
          6: { cellWidth: 18 },  // Kelas
          7: { cellWidth: 28 },  // No HP
          8: { cellWidth: 18 },  // Status
          9: { cellWidth: 35 }   // Nama Ibu
        }
      });

      doc.save(`${fileName}.pdf`);
      Swal.fire('Sukses!', 'Berkas PDF berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal mengekspor data ke PDF.', 'error');
    }
  };

  const exportSiswaExcel = (siswa: Siswa) => {
    exportToExcel([siswa], `Data_Siswa_${siswa.nama.replace(/\s+/g, '_')}`);
  };

  const exportSiswaPDF = (siswa: Siswa) => {
    exportToPDF(
      [siswa], 
      `Data Siswa: ${siswa.nama}`, 
      `Data_Siswa_${siswa.nama.replace(/\s+/g, '_')}`
    );
  };

  const exportBulkExcel = (siswaData: Siswa[]) => {
    if (siswaData.length === 0) {
      Swal.fire('Informasi', 'Tidak ada data siswa untuk diekspor.', 'info');
      return;
    }
    const suffix = selectedKelas ? `Kelas_${getKelasName(selectedKelas).replace(/\s+/g, '_')}` : 'Semua_Kelas';
    exportToExcel(siswaData, `Laporan_Siswa_${suffix}`);
  };

  const exportBulkPDF = (siswaData: Siswa[]) => {
    if (siswaData.length === 0) {
      Swal.fire('Informasi', 'Tidak ada data siswa untuk diekspor.', 'info');
      return;
    }
    const filterTitle = selectedKelas ? `Kelas: ${getKelasName(selectedKelas)}` : 'Semua Kelas';
    const suffix = selectedKelas ? `Kelas_${getKelasName(selectedKelas).replace(/\s+/g, '_')}` : 'Semua_Kelas';
    exportToPDF(siswaData, `Laporan Data Siswa (${filterTitle})`, `Laporan_Siswa_${suffix}`);
  };

  const filteredSiswa = siswaList.filter((s) => {
    const matchesKelas = selectedKelas ? s.kelasId === selectedKelas : true;
    const matchesSearch = searchQuery
      ? s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nisn.includes(searchQuery) ||
        (s.nik && s.nik.includes(searchQuery)) ||
        (s.namaIbu && s.namaIbu.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesKelas && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {[
          { id: 'dashboard', label: 'Laporan Dashboard' },
          { id: 'ringkasan_bulanan', label: 'Ringkasan Bulanan' },
          { id: 'siswa', label: 'Lap. Data Siswa' },
          { id: 'akademik', label: 'Lap. Akademik' },
          { id: 'keuangan', label: 'Lap. Keuangan' },
          { id: 'bk', label: 'Lap. BK & Pelanggaran' },
          { id: 'inventaris', label: 'Lap. Sarpras (Aset)' }
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-rep-${tab.id}`}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all border ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'ringkasan_bulanan' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-xs animate-fade-in-up">
          <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Periode Berjalan
              </span>
              <h4 className="font-black text-slate-800 text-base uppercase flex items-center gap-2 mt-1">
                <BarChart className="w-5 h-5 text-blue-600" /> Laporan Ringkasan Bulanan Operasional
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Statistik akumulasi kehadiran harian siswa dan performa capaian keuangan sekolah untuk audit dan evaluasi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                  
                  // Kop Sekolah
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(14);
                  doc.setTextColor(30, 41, 59);
                  doc.text('ROMBONGAN BELAJAR KARANG TARUNA KECAMATAN TAMBORA', 105, 15, { align: 'center' });
                  
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  doc.setTextColor(100, 116, 139);
                  doc.text('Sistem Informasi Manajemen ERP Sekolah & Lembaga Pendidikan', 105, 20, { align: 'center' });
                  doc.text('Jl. Tambora VIII No. 1, Kecamatan Tambora, Jakarta Barat | Telp: (021) 555-0199', 105, 25, { align: 'center' });
                  
                  doc.setDrawColor(203, 213, 225);
                  doc.setLineWidth(0.8);
                  doc.line(14, 28, 196, 28);

                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(12);
                  doc.setTextColor(15, 23, 42);
                  doc.text('LAPORAN RINGKASAN BULANAN OPERASIONAL', 105, 36, { align: 'center' });
                  doc.setFontSize(9);
                  doc.setFont('helvetica', 'normal');
                  doc.text('Periode Evaluasi: Agustus 2026', 105, 41, { align: 'center' });

                  // Table 1: Kehadiran
                  autoTable(doc, {
                    startY: 46,
                    head: [['INDIKATOR KEHADIRAN SISWA', 'AKUMULASI BULAN INI', 'STATUS PERFORMANCE']],
                    body: [
                    ],
                    theme: 'grid',
                    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 8.5, cellPadding: 3 }
                  });

                  // Table 2: Keuangan
                  const lastY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 100;
                  autoTable(doc, {
                    startY: lastY,
                    head: [['METRIK PERFORMA KEUANGAN & KOLEKSI', 'TOTAL NOMINAL (IDR)', 'PERSENTASE CAPAIAN']],
                    body: [
                    ],
                    theme: 'grid',
                    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 8.5, cellPadding: 3 }
                  });

                  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 180;
                  doc.setFontSize(8);
                  doc.setTextColor(148, 163, 184);
                  doc.text('Dicetak otomatis dari Sistem ERP Rombel KTCT Tambora | Tanggal Cetak: ' + new Date().toLocaleDateString('id-ID'), 14, finalY);

                  doc.save('Laporan_Ringkasan_Bulanan_Agustus_2026.pdf');
                  Swal.fire('Sukses!', 'Laporan Ringkasan Bulanan PDF berhasil diunduh dengan Kop Resmi.', 'success');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak PDF (Header Sekolah)
              </button>

              <button
                onClick={() => {
                  const wsData = [
                   ];
                  const ws = XLSX.utils.aoa_to_sheet(wsData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan Bulanan');
                  XLSX.writeFile(wb, 'Laporan_Ringkasan_Bulanan_Agustus_2026.xlsx');
                  Swal.fire('Sukses!', 'Excel Ringkasan Bulanan berhasil diunduh.', 'success');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Unduh Excel Ringkasan
              </button>
            </div>
          </div>

          {/* Monthly KPI Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Accumulation Presensi */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl"><Users className="w-5 h-5" /></div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-sm">Akumulasi Kehadiran Siswa</h5>
                    <span className="text-[10px] text-slate-400 block font-medium">Bulan Agustus 2026 (22 Hari Kerja)</span>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 font-black px-2.5 py-1 rounded-full text-[11px]">
                  96.5% Hadir
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Presensi Hadir</span>
                  <h6 className="text-lg font-black text-emerald-600 mt-0.5">1.240 <span className="text-xs font-medium text-slate-400">kali</span></h6>
                  <p className="text-[9px] text-slate-500 mt-1">96.5% dari total log</p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Izin & Sakit</span>
                  <h6 className="text-lg font-black text-amber-600 mt-0.5">32 <span className="text-xs font-medium text-slate-400">kasus</span></h6>
                  <p className="text-[9px] text-slate-500 mt-1">Disertai surat / berkas</p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Alpa / Tanpa Keterangan</span>
                  <h6 className="text-lg font-black text-rose-600 mt-0.5">13 <span className="text-xs font-medium text-slate-400">kasus</span></h6>
                  <p className="text-[9px] text-slate-500 mt-1">Follow up BK & Orangtua</p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Kelas Terdisiplin</span>
                  <h6 className="text-lg font-black text-blue-600 mt-0.5">X-1 <span className="text-xs font-medium text-slate-400">(99.2%)</span></h6>
                  <p className="text-[9px] text-slate-500 mt-1">Kehadiran tertinggi</p>
                </div>
              </div>
            </div>

            {/* Card 2: Financial Performance */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-sm">Performa Koleksi Keuangan</h5>
                    <span className="text-[10px] text-slate-400 block font-medium">Bulan Agustus 2026 (SPP & Kasir)</span>
                  </div>
                </div>
                <span className="bg-blue-100 text-blue-800 font-black px-2.5 py-1 rounded-full text-[11px]">
                  94.2% Kolektibilitas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Tagihan Terbit</span>
                  <h6 className="text-base font-black text-slate-800 mt-0.5">Rp 148,5 Juta</h6>
                  <p className="text-[9px] text-slate-500 mt-1">Seluruh siswa aktif</p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Kas Masuk Realisasi</span>
                  <h6 className="text-base font-black text-emerald-600 mt-0.5">Rp 139,8 Juta</h6>
                  <p className="text-[9px] text-slate-500 mt-1">Lunas & dicatat kasir</p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Sisa Tunggakan SPP</span>
                  <h6 className="text-base font-black text-rose-600 mt-0.5">Rp 8,6 Juta</h6>
                  <p className="text-[9px] text-slate-500 mt-1">Pending reminder WA</p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Kas Tabungan Siswa</span>
                  <h6 className="text-base font-black text-indigo-600 mt-0.5">Rp 24,5 Juta</h6>
                  <p className="text-[9px] text-slate-500 mt-1">Tersimpan aman</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeSubTab === 'siswa' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-xs">
          <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Laporan Data Pokok Siswa
              </h4>
              <p className="text-xs text-slate-400 mt-1">Unduh PDF dan Excel data siswa dengan filter kelas atau perorangan.</p>
            </div>
            
            {/* Bulk Download buttons */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => exportBulkExcel(filteredSiswa)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Unduh Excel ({filteredSiswa.length} Siswa)
              </button>
              <button 
                onClick={() => exportBulkPDF(filteredSiswa)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
              >
                <Printer className="w-4 h-4" /> Unduh PDF ({filteredSiswa.length} Siswa)
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Filter Kelas</label>
              <select 
                value={selectedKelas} 
                onChange={(e) => setSelectedKelas(e.target.value)} 
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Kelas ({siswaList.length} Siswa)</option>
                {kelasList.map((k) => {
                  const count = siswaList.filter(s => s.kelasId === k.id).length;
                  return (
                    <option key={k.id} value={k.id}>
                      {k.nama} ({count} Siswa)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">Cari Siswa</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan Nama, NISN, NIK, atau Nama Ibu..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-4 w-12 text-center">No</th>
                    <th className="p-4">NISN</th>
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4">Tempat, Tgl Lahir</th>
                    <th className="p-4">NIK</th>
                    <th className="p-4">Kelas</th>
                    <th className="p-4">No HP</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4">Nama Ibu</th>
                    <th className="p-4 text-center w-36 font-black text-slate-400">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredSiswa.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold bg-slate-50/20">
                        Tidak ada data siswa yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSiswa.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/40 transition">
                        <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-4 font-mono font-bold text-slate-800">{s.nisn}</td>
                        <td className="p-4 font-bold text-slate-900">{s.nama}</td>
                        <td className="p-4">
                          {s.tempatLahir ? `${s.tempatLahir}, ` : ''}{s.tglLahir}
                        </td>
                        <td className="p-4 font-mono text-slate-500">{s.nik || '-'}</td>
                        <td className="p-4">
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[10px] font-bold">
                            {getKelasName(s.kelasId)}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{s.noHp || '-'}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            s.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            s.status === 'TIDAK AKTIF' ? 'bg-slate-50 text-slate-600 border border-slate-100' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 font-semibold">{s.namaIbu || '-'}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => exportSiswaExcel(s)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-lg transition"
                              title="Unduh Excel Satuan"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => exportSiswaPDF(s)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition"
                              title="Unduh PDF Satuan"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Laporan Akademik</span>
                <h4 className="text-sm font-black text-slate-800 mt-1">100% Siap Audit</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Laporan Keuangan</span>
                <h4 className="text-sm font-black text-emerald-600 mt-1">Sinkron (98%)</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><BarChart className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Arsip Dapodik</span>
                <h4 className="text-sm font-black text-amber-500 mt-1">Terverifikasi</h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border p-6 rounded-3xl space-y-4">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-emerald-600" /> Checklist Kesiapan Akreditasi Rombel</h4>
              <div className="space-y-3 font-semibold text-slate-600">
                <p className="flex items-center gap-2 text-emerald-600"><CheckCircle className="w-4 h-4" /> Kualifikasi Dokumen SK Pembagian Tugas Mengajar Guru</p>
                <p className="flex items-center gap-2 text-emerald-600"><CheckCircle className="w-4 h-4" /> Cetak Logbook Inventaris Sarpras Rombel</p>
                <p className="flex items-center gap-2 text-emerald-600"><CheckCircle className="w-4 h-4" /> Berkas Hasil Evaluasi KKM & Distribusi Nilai Belajar</p>
              </div>
            </div>

            <div className="bg-white border p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Laporan Kinerja Yayasan Pendidikan</h4>
                <p className="text-slate-400 mt-1 leading-relaxed">Ekspor infografis ringkas mengenai rasio kecukupan guru kelas, nilai rata-rata rombel, dan efisiensi pengeluaran kasir.</p>
              </div>
              <button onClick={() => Swal.fire('Arsip Diunduh', 'Infografis PDF yayasan berhasil dihasilkan.', 'success')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition mt-4">
                Unduh Infografis Yayasan
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'akademik' && (
        <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h4 className="font-black text-slate-800 text-sm uppercase">Daftar Ekspor Berkas Akademik</h4>
            <p className="text-xs text-slate-400 mt-0.5">Hasilkan spreadsheet atau dokumen PDF resmi untuk guru pengajar dan wali kelas.</p>
          </div>

          <div className="space-y-3 pt-2 text-xs font-semibold text-slate-700">
            <div className="p-4 bg-slate-50 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">Rapor Hasil Belajar Siswa</span>
                <span className="text-[10px] text-slate-400 font-medium block">Format PDF resmi Dapodik / Kemenag</span>
                
                {/* Student Selector */}
                <div className="pt-2 flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Pilih Siswa:</label>
                  <select 
                    value={selectedAcademicSiswa} 
                    onChange={(e) => setSelectedAcademicSiswa(e.target.value)}
                    className="bg-white border rounded-lg p-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {siswaList.map(s => (
                      <option key={s.id} value={s.id}>{s.nama} ({getKelasName(s.kelasId)})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-1 self-end md:self-auto">
                <button 
                  onClick={() => handleExport('Rapor Hasil Belajar', 'PDF')} 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1 text-xs shadow-sm transition" 
                  title="PDF"
                >
                  <Printer className="w-4 h-4" /> Cetak Rapor PDF
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border rounded-2xl flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800 block">Log Kehadiran Siswa</span>
                <span className="text-[10px] text-slate-400 font-medium block">Presensi harian dan akumulasi bulanan</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExport('Log Kehadiran Siswa', 'PDF')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 rounded-xl" title="PDF"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Log Kehadiran Siswa', 'EXCEL')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 rounded-xl" title="Excel"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Log Kehadiran Siswa', 'CSV')} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded-xl" title="CSV"><FileSpreadsheet className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border rounded-2xl flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800 block">Statistik SPMB & Pendaftar Baru</span>
                <span className="text-[10px] text-slate-400 font-medium block">Rangkuman seleksi calon siswa</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExport('Statistik SPMB', 'PDF')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 rounded-xl" title="PDF"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Statistik SPMB', 'EXCEL')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 rounded-xl" title="Excel"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Statistik SPMB', 'CSV')} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded-xl" title="CSV"><FileSpreadsheet className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'keuangan' && (
        <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h4 className="font-black text-slate-800 text-sm uppercase">Laporan Keuangan & Neraca Buku</h4>
            <p className="text-xs text-slate-400 mt-0.5">Arsip rekapitulasi realisasi anggaran, tabungan siswa, denda, dan kas operasional.</p>
          </div>

          <div className="space-y-3 pt-2 text-xs font-semibold text-slate-700">
            <div className="p-4 bg-slate-50 border rounded-2xl flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800 block">Jurnal Umum & Arus Kas</span>
                <span className="text-[10px] text-slate-400 font-medium block">Pencatatan uang masuk dan keluar</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExport('Jurnal Umum', 'PDF')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 rounded-xl" title="PDF"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Jurnal Umum', 'EXCEL')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 rounded-xl" title="Excel"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Jurnal Umum', 'CSV')} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded-xl" title="CSV"><FileSpreadsheet className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border rounded-2xl flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800 block">Rekapitulasi Denda & Tabungan</span>
                <span className="text-[10px] text-slate-400 font-medium block">Tunggakan serta saldo kas tabungan</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExport('Rekap Denda & Tabungan', 'PDF')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 rounded-xl" title="PDF"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Rekap Denda & Tabungan', 'EXCEL')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 rounded-xl" title="Excel"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Rekap Denda & Tabungan', 'CSV')} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded-xl" title="CSV"><FileSpreadsheet className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border rounded-2xl flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800 block">Rekapitulasi Tagihan Siswa</span>
                <span className="text-[10px] text-slate-400 font-medium block">Rincian status pembayaran seluruh siswa aktif</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExport('Rekap Tagihan Siswa', 'PDF')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 rounded-xl" title="PDF"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Rekap Tagihan Siswa', 'EXCEL')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 rounded-xl" title="Excel"><Download className="w-4 h-4" /></button>
                <button onClick={() => handleExport('Rekap Tagihan Siswa', 'CSV')} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded-xl" title="CSV"><FileSpreadsheet className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'bk' && (() => {
        const bimbinganList = db.get<any>('bimbingan') || [];
        const pelanggaranList = db.get<any>('pelanggaran') || [];
        const siswaList = db.get<any>('siswa') || [];
        const kelasList = db.get<any>('kelas') || [];

        const getSiswaName = (id: string) => {
          const s = siswaList.find((x: any) => x.id === id || x.noPdkt === id);
          return s ? s.nama : id;
        };

        const handlePrintBK = () => {
          Swal.fire({
            title: 'Mengekspor Laporan BK...',
            timer: 1500,
            timerProgressBar: true,
            didOpen: () => Swal.showLoading(),
            willClose: () => {
              Swal.fire('Sukses', 'Laporan BK berhasil diunduh.', 'success');
            }
          });
        };

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in-up">
            <div className="border-b pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg uppercase">Laporan & Evaluasi BK</h3>
                <p className="text-xs text-slate-400 mt-1">Rekapitulasi statistik pembinaan kedisiplinan dan konseling minat bakat siswa.</p>
              </div>
              <button 
                onClick={handlePrintBK} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
              >
                <FileText className="w-4 h-4" /> Cetak Laporan BK (.pdf)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Sesi Konseling Selesai</span>
                <h4 className="text-3xl font-black text-blue-600">{bimbinganList.length}</h4>
                <p className="text-[10px] text-slate-500 font-semibold">Terselesaikan oleh Koordinator BK</p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Pelanggaran Tercatat</span>
                <h4 className="text-3xl font-black text-rose-600">{pelanggaranList.length}</h4>
                <p className="text-[10px] text-slate-500 font-semibold">Total bobot penegakan aturan</p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Rata-rata Poin Per Kasus</span>
                <h4 className="text-3xl font-black text-amber-500">
                  {pelanggaranList.length > 0 
                    ? (pelanggaranList.reduce((acc: number, p: any) => acc + p.poin, 0) / pelanggaranList.length).toFixed(1) 
                    : '0'}
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold">Tingkat keparahan pelanggaran</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-2xl p-5 space-y-3 bg-white">
                <h5 className="font-extrabold text-xs text-slate-700 uppercase border-b pb-2">Distribusi Jenis Konseling</h5>
                <div className="space-y-2 text-xs">
                  {['Akademik', 'Sosial', 'Karir', 'Pribadi'].map((kategori) => {
                    const count = bimbinganList.filter((b: any) => b.jenis === kategori).length;
                    const total = bimbinganList.length || 1;
                    const pct = ((count / total) * 100).toFixed(0);
                    return (
                      <div key={kategori} className="space-y-1">
                        <div className="flex justify-between font-bold text-slate-600">
                          <span>{kategori}</span>
                          <span>{count} Kasus ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border rounded-2xl p-5 space-y-3 bg-white">
                <h5 className="font-extrabold text-xs text-slate-700 uppercase border-b pb-2">Catatan Pelanggaran Terbanyak</h5>
                <div className="space-y-2 text-xs">
                  {pelanggaranList.length > 0 ? (
                    pelanggaranList.slice(0, 5).map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center border-b pb-1.5 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-slate-800">{getSiswaName(p.siswaId)}</p>
                          <p className="text-[10px] text-slate-400">{p.namaPelanggaran}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded text-[10px]">
                          +{p.poin} Poin
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest py-4">KOSONG</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {activeSubTab === 'inventaris' && (() => {
        const barangList = db.get<any>('barang') || [];
        const totalUnit = barangList.reduce((acc: number, b: any) => acc + (b.jumlah || 0), 0);
        const rusakUnit = barangList.filter((b: any) => (b.kondisi || '').toLowerCase() === 'rusak' || (b.kondisi || '').toLowerCase() === 'rusak berat').length;
        
        const handlePrintInventaris = () => {
          Swal.fire({
            title: 'Mengekspor Laporan Sarpras...',
            timer: 1500,
            timerProgressBar: true,
            didOpen: () => Swal.showLoading(),
            willClose: () => {
              Swal.fire('Sukses', 'Laporan Sarpras/Inventaris berhasil diunduh.', 'success');
            }
          });
        };

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in-up">
            <div className="border-b pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg uppercase">Laporan Sarana Prasarana & Aset</h3>
                <p className="text-xs text-slate-400 mt-1">Status dan rekapitulasi inventarisasi gedung, ruang, dan perabot sekolah.</p>
              </div>
              <button 
                onClick={handlePrintInventaris} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
              >
                <FileText className="w-4 h-4" /> Cetak Laporan Sarpras (.pdf)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Total Ragam Barang</span>
                <h4 className="text-3xl font-black text-blue-600">{barangList.length} Item</h4>
                <p className="text-[10px] text-slate-500 font-semibold">Tercatat di katalog utama</p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Total Volume Barang</span>
                <h4 className="text-3xl font-black text-indigo-600">{totalUnit} Unit</h4>
                <p className="text-[10px] text-slate-500 font-semibold">Volume fisik sarana prasarana</p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Kondisi Rusak</span>
                <h4 className="text-3xl font-black text-rose-600">{rusakUnit} Item</h4>
                <p className="text-[10px] text-slate-500 font-semibold">Perlu perbaikan / penghapusan</p>
              </div>
            </div>

            <div className="border rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nama Barang</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Lokasi</th>
                    <th className="p-3 text-center">Jumlah</th>
                    <th className="p-3 text-center">Kondisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {barangList.length > 0 ? (
                    barangList.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{item.namaBarang}</td>
                        <td className="p-3">{item.kategori}</td>
                        <td className="p-3">{item.lokasi || 'KOSONG'}</td>
                        <td className="p-3 text-center font-bold">{item.jumlah} Unit</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.kondisi === 'BAIK' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {item.kondisi}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest">KOSONG</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

declare const Swal: any;
export {};
