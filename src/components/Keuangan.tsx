import React, { useState, useEffect } from 'react';
import { db } from '../data/db';
import { Tagihan, Pembayaran, Tabungan, Siswa, Kelas, Biaya } from '../types';
import { generateStructuredTabunganId } from '../lib/keuanganNormalizers';
import { useSubTab } from '../utils/subTabHelper';
import MonthlyCashflowD3Chart from './MonthlyCashflowD3Chart';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Briefcase,
  Printer,
  DollarSign,
  Info,
  Save
} from 'lucide-react';

interface KeuanganProps {
  user: any;
  forceSubTab?: string;
}

export default function Keuangan({ user, forceSubTab }: KeuanganProps) {
  // Config state for SPPku database configuration
  const [keuanganConfig, setKeuanganConfig] = useState<any[]>(() => {
    const saved = localStorage.getItem('ERP_keuangan_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { key: 'appName', value: 'KSL - SPPku' },
      { key: 'sign', value: 'by Kucing Storia Labs' },
      { key: 'version', value: 'v3.4' },
      { key: 'schoolName', value: 'Rombongan Belajar Karang Taruna Kecamatan Tambora' }
    ];
  });

  const saveKeuanganConfig = (newConfig: any[]) => {
    setKeuanganConfig(newConfig);
    localStorage.setItem('ERP_keuangan_config', JSON.stringify(newConfig));
  };

  const getConfigValue = (key: string, def: string) => {
    const found = keuanganConfig.find(item => item.key === key);
    return found ? found.value : def;
  };

  const appName = getConfigValue('appName', 'KSL - SPPku');
  const sign = getConfigValue('sign', 'by Kucing Storia Labs');
  const version = getConfigValue('version', 'v3.4');
  const schoolName = getConfigValue('schoolName', 'Rombongan Belajar Karang Taruna Kecamatan Tambora');

  // Dynamic role-filtered subtabs for Keuangan
  const allTabs = [
    { id: 'biaya', label: 'Daftar Tarif Biaya', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA', 'SISWA', 'ORANG_TUA'] },
    { id: 'tagihan', label: (user.role === 'SISWA' || user.role === 'ORANG_TUA') ? 'Tagihan Saya' : 'Tagihan & Invoice', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA', 'SISWA', 'ORANG_TUA'] },
    { id: 'bayar', label: 'Kasir Terima Bayar', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA'] },
    { id: 'tabungan', label: (user.role === 'SISWA' || user.role === 'ORANG_TUA') ? 'Tabungan' : 'Tabungan Siswa', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA', 'SISWA', 'ORANG_TUA'] },
    { id: 'riwayat', label: (user.role === 'SISWA' || user.role === 'ORANG_TUA') ? 'Riwayat Pembayaran' : 'Riwayat Transaksi', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA', 'SISWA', 'ORANG_TUA'] },
    { id: 'jurnal', label: 'Kas & Buku Jurnal', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA'] },
    { id: 'pengeluaran', label: 'Pengeluaran Sekolah', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA'] },
    { id: 'laporan', label: 'Laporan Keuangan', roles: ['SUPERADMIN', 'ADMIN', 'BENDAHARA'] }
  ];

  // If forceSubTab is NOT specified, we remove 'biaya' and 'laporan' from the rendered tabs to prevent confusion
  const filteredAllTabs = forceSubTab 
    ? allTabs.filter(tab => tab.id === forceSubTab)
    : allTabs.filter(tab => tab.id !== 'biaya' && tab.id !== 'laporan');

  const allowedTabs = filteredAllTabs.filter(tab => tab.roles.includes(user.role));

  const [activeSubTab, setActiveSubTab] = useSubTab<string>('keuangan', forceSubTab || 'tagihan');

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(allowedTabs[0].id);
    }
  }, [user.role, activeSubTab]);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [tabunganList, setTabunganList] = useState<Tabungan[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [biayaList, setBiayaList] = useState<Biaya[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);

  // Biaya Search, Filter & Modal States
  const [biayaSearch, setBiayaSearch] = useState('');
  const [biayaFilterKelas, setBiayaFilterKelas] = useState('');
  const [biayaFilterPrioritas, setBiayaFilterPrioritas] = useState('');
  const [biayaFilterTahunAjaran, setBiayaFilterTahunAjaran] = useState('');
  
  const [isBiayaModalOpen, setIsBiayaModalOpen] = useState(false);
  const [selectedBiaya, setSelectedBiaya] = useState<Biaya | null>(null);
  const [biayaFormId, setBiayaFormId] = useState('');
  const [biayaFormNama, setBiayaFormNama] = useState('');
  const [biayaFormNominal, setBiayaFormNominal] = useState('');
  const [biayaFormKelasId, setBiayaFormKelasId] = useState('');
  const [biayaFormAktif, setBiayaFormAktif] = useState(true);
  const [biayaFormTargetKelas, setBiayaFormTargetKelas] = useState('');
  const [biayaFormPrioritas, setBiayaFormPrioritas] = useState('WAJIB');
  const [biayaFormTahunAjaran, setBiayaFormTahunAjaran] = useState(() => localStorage.getItem('ERP_academic_year') || '2026/2027');

  // Selection & Modal States
  const [isBayarModalOpen, setIsBayarModalOpen] = useState(false);
  const [selectedTagihan, setSelectedTagihan] = useState<Tagihan | null>(null);
  const [bayarMetode, setBayarMetode] = useState<'CASH' | 'TRANSFER' | 'TABUNGAN'>('CASH');
  const [bayarJumlah, setBayarJumlah] = useState('');
  const [bayarCatatan, setBayarCatatan] = useState('');

  useEffect(() => {
    loadAllData();
    const handleDbSynced = () => loadAllData();
    window.addEventListener('erp-db-synced', handleDbSynced);
    return () => window.removeEventListener('erp-db-synced', handleDbSynced);
  }, [activeSubTab]);

  const loadAllData = () => {
    setTagihanList(db.get<Tagihan>('tagihan'));
    setPembayaranList(db.get<Pembayaran>('pembayaran'));
    setTabunganList(db.get<Tabungan>('tabungan'));
    setSiswaList(db.get<Siswa>('siswa'));
    setKelasList(db.get<Kelas>('kelas'));
    setBiayaList(db.get<Biaya>('biaya'));
    setTahunAjaranList(db.get<any>('tahun_ajaran') || []);
    setPengeluaranList(db.get<any>('pengeluaran') || []);
  };

  const getSiswaName = (id: string) => {
    const s = siswaList.find(x => x.id === id);
    return s ? s.nama : id;
  };

  // Helper filters for role security
  const getFilteredTagihan = () => {
    if (user.role === 'SISWA') {
      const matchedSiswa = siswaList.find(s => s.nisn === user.username || s.id === `SIS_${user.username}` || s.nama === user.name);
      return matchedSiswa ? tagihanList.filter(t => t.siswaId === matchedSiswa.id) : [];
    } else if (user.role === 'ORANG_TUA') {
      const parentSiswaIds = user.siswaIds ? user.siswaIds.split(',') : ['SIS_budi'];
      return tagihanList.filter(t => parentSiswaIds.includes(t.siswaId));
    }
    return tagihanList;
  };

  const getFilteredTabungan = () => {
    if (user.role === 'SISWA') {
      const matchedSiswa = siswaList.find(s => s.nisn === user.username || s.id === `SIS_${user.username}` || s.nama === user.name);
      return matchedSiswa ? tabunganList.filter(t => t.siswaId === matchedSiswa.id) : [];
    } else if (user.role === 'ORANG_TUA') {
      const parentSiswaIds = user.siswaIds ? user.siswaIds.split(',') : ['SIS_budi'];
      return tabunganList.filter(t => parentSiswaIds.includes(t.siswaId));
    }
    return tabunganList;
  };

  const getFilteredPembayaran = () => {
    if (user.role === 'SISWA') {
      const matchedSiswa = siswaList.find(s => s.nisn === user.username || s.id === `SIS_${user.username}` || s.nama === user.name);
      return matchedSiswa ? pembayaranList.filter(p => {
        const tag = tagihanList.find(t => t.id === p.tagihanId);
        return tag && tag.siswaId === matchedSiswa.id;
      }) : [];
    } else if (user.role === 'ORANG_TUA') {
      const parentSiswaIds = user.siswaIds ? user.siswaIds.split(',') : ['SIS_budi'];
      return pembayaranList.filter(p => {
        const tag = tagihanList.find(t => t.id === p.tagihanId);
        return tag && parentSiswaIds.includes(tag.siswaId);
      });
    }
    return pembayaranList;
  };

  const getSiswaNisn = (id: string) => {
    const s = siswaList.find(x => x.id === id);
    return s ? s.nisn : '';
  };

  const exportTagihanToExcel = () => {
    try {
      const data = getFilteredTagihan().map((t, idx) => ({
        'No': idx + 1,
        'Nama Siswa': getSiswaName(t.siswaId),
        'NISN': getSiswaNisn(t.siswaId),
        'Jenis Tagihan': t.jenis || t.namaBiaya || '',
        'Periode': t.periode || '',
        'Jatuh Tempo': t.jatuhTempo || '',
        'Total Tagihan': t.total || t.nominalAsli || 0,
        'Terbayar': t.terbayar || t.paidAmount || 0,
        'Sisa Tagihan': (t.total || t.nominalAsli || 0) - (t.terbayar || t.paidAmount || 0),
        'Status': t.status || ''
      }));

      const worksheet = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(worksheet, ws, 'REKAP_TAGIHAN');
      XLSX.writeFile(worksheet, `${appName.replace(/\s+/g, '_')}_Rekap_Tagihan.xlsx`);
      Swal.fire('Sukses', 'Laporan Rekap Tagihan dalam Excel berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal memproses ekspor Excel.', 'error');
    }
  };

  const exportTagihanToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(`${appName.toUpperCase()} - REKAPITULASI INVOICE & TAGIHAN SISWA`, 14, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${schoolName} | Version ${version} | ${sign}`, 14, 21);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 14, 26);
      doc.setLineWidth(0.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 29, 283, 29);

      const headers = [['No', 'Nama Siswa', 'NISN', 'Jenis Tagihan', 'Periode', 'Jatuh Tempo', 'Total Tagihan', 'Terbayar', 'Sisa Tagihan', 'Status']];
      const tableData = getFilteredTagihan().map((t, idx) => [
        idx + 1,
        getSiswaName(t.siswaId),
        getSiswaNisn(t.siswaId),
        t.jenis || t.namaBiaya || '',
        t.periode || '',
        t.jatuhTempo || '',
        formatRupiah(t.total || t.nominalAsli || 0),
        formatRupiah(t.terbayar || t.paidAmount || 0),
        formatRupiah((t.total || t.nominalAsli || 0) - (t.terbayar || t.paidAmount || 0)),
        t.status || ''
      ]);

      autoTable(doc, {
        startY: 33,
        head: headers,
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, font: 'helvetica' },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      doc.save(`${appName.replace(/\s+/g, '_')}_Rekap_Tagihan.pdf`);
      Swal.fire('Sukses', 'Laporan Rekap Tagihan dalam PDF berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal memproses ekspor PDF.', 'error');
    }
  };

  const exportTabunganToExcel = () => {
    try {
      const data = getFilteredTabungan().map((t, idx) => ({
        'No': idx + 1,
        'Nama Siswa': getSiswaName(t.siswaId),
        'NISN': getSiswaNisn(t.siswaId),
        'Tanggal': t.tanggal || '',
        'Jenis Transaksi': t.jenis || '',
        'Nominal': t.nominal || 0,
        'Saldo Akhir': t.saldoAfter || 0,
        'Catatan': t.catatan || '',
        'Petugas': t.createdBy || ''
      }));

      const worksheet = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(worksheet, ws, 'BUKU_TABUNGAN');
      XLSX.writeFile(worksheet, `${appName.replace(/\s+/g, '_')}_Buku_Tabungan.xlsx`);
      Swal.fire('Sukses', 'Buku Tabungan dalam Excel berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal memproses ekspor Excel.', 'error');
    }
  };

  const exportTabunganToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(`${appName.toUpperCase()} - REKAP BUKU TABUNGAN SISWA`, 14, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${schoolName} | Version ${version} | ${sign}`, 14, 21);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 14, 26);
      doc.setLineWidth(0.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 29, 283, 29);

      const headers = [['No', 'Nama Siswa', 'NISN', 'Tanggal', 'Jenis', 'Nominal', 'Saldo Akhir', 'Catatan', 'Petugas']];
      const tableData = getFilteredTabungan().map((t, idx) => [
        idx + 1,
        getSiswaName(t.siswaId),
        getSiswaNisn(t.siswaId),
        t.tanggal || '',
        t.jenis || '',
        formatRupiah(t.nominal || 0),
        formatRupiah(t.saldoAfter || 0),
        t.catatan || '',
        t.createdBy || ''
      ]);

      autoTable(doc, {
        startY: 33,
        head: headers,
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, font: 'helvetica' },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      doc.save(`${appName.replace(/\s+/g, '_')}_Buku_Tabungan.pdf`);
      Swal.fire('Sukses', 'Buku Tabungan dalam PDF berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal memproses ekspor PDF.', 'error');
    }
  };

  const exportRiwayatToExcel = () => {
    try {
      const data = getFilteredPembayaran().map((p, idx) => ({
        'No': idx + 1,
        'ID Transaksi': p.id || '',
        'Invoice ID': p.invoiceId || '',
        'Nama Siswa': getSiswaName(p.siswaId),
        'NISN': getSiswaNisn(p.siswaId),
        'Tanggal Bayar': p.tglBayar || '',
        'Metode': p.metode || '',
        'Jumlah Bayar': p.jumlah || 0,
        'Catatan': p.catatan || ''
      }));

      const worksheet = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(worksheet, ws, 'RIWAYAT_TRANSAKSI');
      XLSX.writeFile(worksheet, `${appName.replace(/\s+/g, '_')}_Riwayat_Transaksi.xlsx`);
      Swal.fire('Sukses', 'Riwayat Transaksi dalam Excel berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal memproses ekspor Excel.', 'error');
    }
  };

  const exportRiwayatToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(`${appName.toUpperCase()} - RIWAYAT TRANSAKSI PEMBAYARAN SISWA`, 14, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${schoolName} | Version ${version} | ${sign}`, 14, 21);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 14, 26);
      doc.setLineWidth(0.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 29, 283, 29);

      const headers = [['No', 'ID Transaksi', 'Invoice ID', 'Nama Siswa', 'NISN', 'Tanggal Bayar', 'Metode', 'Jumlah Bayar', 'Catatan']];
      const tableData = getFilteredPembayaran().map((p, idx) => [
        idx + 1,
        p.id || '',
        p.invoiceId || '',
        getSiswaName(p.siswaId),
        getSiswaNisn(p.siswaId),
        p.tglBayar || '',
        p.metode || '',
        formatRupiah(p.jumlah || 0),
        p.catatan || ''
      ]);

      autoTable(doc, {
        startY: 33,
        head: headers,
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, font: 'helvetica' },
        headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      doc.save(`${appName.replace(/\s+/g, '_')}_Riwayat_Transaksi.pdf`);
      Swal.fire('Sukses', 'Riwayat Transaksi dalam PDF berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal memproses ekspor PDF.', 'error');
    }
  };

  const exportFinancialReportToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`${appName.toUpperCase()} - LAPORAN NERACA DAN LABA RUGI SEKOLAH`, 105, 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${schoolName} - Periode Anggaran Semester Ganjil 2026 | ${version} ${sign}`, 105, 20, { align: 'center' });
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 105, 24, { align: 'center' });
      doc.setLineWidth(0.5);
      doc.setDrawColor(148, 163, 184);
      doc.line(15, 28, 195, 28);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('I. LAPORAN NERACA (POSISI KEUANGAN)', 15, 36);

      const neracaHeaders = [['Akun Pos Keuangan', 'Nilai Saldo']];
      const neracaData = [
        ['Aset Lancar - Kas Utama Sekolah', formatRupiah(72100000)],
        ['Aset Lancar - Piutang SPP Siswa', formatRupiah(12400000)],
        ['TOTAL ASET LANCAR', formatRupiah(84500000)]
      ];

      autoTable(doc, {
        startY: 39,
        head: neracaHeaders,
        body: neracaData,
        theme: 'grid',
        styles: { fontSize: 8.5, font: 'helvetica' },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      const finalY1 = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('II. LAPORAN LABA / RUGI OPERASIONAL', 15, finalY1);

      const labaRugiHeaders = [['Uraian Rekonsiliasi Pendapatan & Beban', 'Nilai Saldo']];
      const labaRugiData = [
        ['Total Pemasukan Pendidikan (SPP & Iuran)', formatRupiah(84500000)],
        ['Total Biaya Operasional & Gaji Guru', `(${formatRupiah(1650000)})`],
        ['SURPLUS / SURPLUS BERSIH', formatRupiah(82850000)]
      ];

      autoTable(doc, {
        startY: finalY1 + 3,
        head: labaRugiHeaders,
        body: labaRugiData,
        theme: 'grid',
        styles: { fontSize: 8.5, font: 'helvetica' },
        headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      doc.save(`${appName.replace(/\s+/g, '_')}_Laporan_Neraca_Laba_Rugi.pdf`);
      Swal.fire('Sukses', 'Laporan Neraca & Laba Rugi PDF berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal mengekspor laporan keuangan PDF.', 'error');
    }
  };

  const exportFinancialReportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const neracaData = [

      ];
      const wsNeraca = XLSX.utils.json_to_sheet(neracaData);
      XLSX.utils.book_append_sheet(workbook, wsNeraca, 'NERACA');

      const labaRugiData = [

      ];
      const wsLabaRugi = XLSX.utils.json_to_sheet(labaRugiData);
      XLSX.utils.book_append_sheet(workbook, wsLabaRugi, 'LABA_RUGI');

      XLSX.writeFile(workbook, `${appName.replace(/\s+/g, '_')}_Laporan_Keuangan_Tahunan.xlsx`);
      Swal.fire('Sukses', 'Laporan Keuangan Excel (.xlsx) berhasil diunduh.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Gagal mengekspor laporan keuangan Excel.', 'error');
    }
  };

  // State variables for Tabungan & Pengeluaran
  const [tabunganSiswaId, setTabunganSiswaId] = useState('');
  const [tabunganJenis, setTabunganJenis] = useState<'SETOR' | 'TARIK'>('SETOR');
  const [tabunganNominal, setTabunganNominal] = useState('');
  const [tabunganCatatan, setTabunganCatatan] = useState('');

  const [pengeluaranList, setPengeluaranList] = useState<any[]>([]);
  const [expNama, setExpNama] = useState('');
  const [expNominal, setExpNominal] = useState('');
  const [expKategori, setExpKategori] = useState('Operasional');

  // Automatically select first student on load if empty
  useEffect(() => {
    if (siswaList.length > 0 && !tabunganSiswaId) {
      setTabunganSiswaId(siswaList[0].id);
    }
  }, [siswaList]);

  const handleTabunganSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tabunganSiswaId || !tabunganNominal) {
      Swal.fire('Error', 'Pilih siswa dan masukkan nominal transaksi.', 'error');
      return;
    }
    const nominalNum = Number(tabunganNominal);
    if (isNaN(nominalNum) || nominalNum <= 0) {
      Swal.fire('Error', 'Nominal harus angka positif.', 'error');
      return;
    }

    const student = (siswaList || []).find((s: any) => s.id === tabunganSiswaId || s.nis === tabunganSiswaId || s.nopdkt === tabunganSiswaId);
    const studentNopdkt = student?.nopdkt || student?.noPdkt || student?.NoPDKT || student?.nis || student?.NIS || student?.idNumber || (tabunganSiswaId && !String(tabunganSiswaId).startsWith('SIS_') ? tabunganSiswaId : '');
    const existingTabs = db.get<any>('tabungan') || db.get<any>('keuangan_tabungan') || db.get<any>('TABUNGAN') || [];
    const tglTransaksi = new Date().toISOString().split('T')[0];
    const tabId = generateStructuredTabunganId(tabunganJenis, tglTransaksi, studentNopdkt, existingTabs);

    const newTabungan: Tabungan = {
      id: tabId,
      siswaId: tabunganSiswaId,
      tanggal: tglTransaksi,
      nominal: nominalNum,
      jenis: tabunganJenis,
      catatan: tabunganCatatan || (tabunganJenis === 'SETOR' ? 'Setoran Tabungan' : 'Penarikan Tabungan'),
      createdBy: user.name
    };

    db.insert<Tabungan>('tabungan', newTabungan);
    Swal.fire('Sukses!', `Transaksi ${tabunganJenis === 'SETOR' ? 'Setoran' : 'Penarikan'} tabungan berhasil dicatat.`, 'success');
    setTabunganNominal('');
    setTabunganCatatan('');
    loadAllData();
  };

  const handlePengeluaranSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expNama || !expNominal) {
      Swal.fire('Error', 'Lengkapi deskripsi dan nominal pengeluaran.', 'error');
      return;
    }
    const nom = Number(expNominal);
    if (isNaN(nom) || nom <= 0) {
      Swal.fire('Error', 'Nominal harus angka positif.', 'error');
      return;
    }

    const newExp = {
      id: 'EXP_' + Date.now(),
      tanggal: new Date().toISOString().split('T')[0],
      deskripsi: expNama,
      nominal: nom,
      kategori: expKategori
    };

    db.insert('pengeluaran', newExp);
    Swal.fire('Sukses!', 'Catatan pengeluaran operasional berhasil disimpan.', 'success');
    setExpNama('');
    setExpNominal('');
    loadAllData();
  };

  const formatRupiah = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return 'Rp 0';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const handlePembayaranSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTagihan) return;

    const jumlahNum = Number(bayarJumlah.replace(/\D/g, ''));
    if (jumlahNum <= 0) {
      Swal.fire('Error', 'Jumlah pembayaran harus diisi.', 'error');
      return;
    }

    const bayarSisa = selectedTagihan.total - selectedTagihan.terbayar;
    if (jumlahNum > bayarSisa) {
      Swal.fire('Peringatan', `Jumlah melebihi sisa tagihan (${formatRupiah(bayarSisa)})`, 'warning');
      return;
    }

    const newTerbayar = selectedTagihan.terbayar + jumlahNum;
    const newStatus = newTerbayar >= selectedTagihan.total ? 'LUNAS' : 'SEBAGIAN';

    // Update Tagihan
    db.update<any>('tagihan', 'id', selectedTagihan.id, {
      terbayar: newTerbayar,
      status: newStatus
    });

    // Insert Pembayaran Log
    const newPem: any = {
      id: `PEM_${Date.now().toString().slice(-4)}`,
      tagihanId: selectedTagihan.id,
      tanggal: new Date().toISOString().slice(0, 10),
      nominal: jumlahNum,
      metode: bayarMetode,
      catatan: bayarCatatan,
      createdBy: user.name
    };
    db.insert<any>('pembayaran', newPem);

    Swal.fire({
      title: 'Pembayaran Sukses!',
      text: 'Kuitansi pembayaran resmi telah berhasil dicetak dan dicatat.',
      icon: 'success',
      confirmButtonColor: '#3b82f6'
    });

    setIsBayarModalOpen(false);
    setSelectedTagihan(null);
    setBayarJumlah('');
    setBayarCatatan('');
    loadAllData();
  };

  const handleOpenAddBiaya = () => {
    setSelectedBiaya(null);
    setBiayaFormId('');
    setBiayaFormNama('');
    setBiayaFormNominal('');
    setBiayaFormKelasId('');
    setBiayaFormAktif(true);
    setBiayaFormTargetKelas('');
    setBiayaFormPrioritas('WAJIB');
    setBiayaFormTahunAjaran(localStorage.getItem('ERP_academic_year') || '2026/2027');
    setIsBiayaModalOpen(true);
  };

  const handleOpenEditBiaya = (b: Biaya) => {
    setSelectedBiaya(b);
    setBiayaFormId(b.id);
    setBiayaFormNama(b.nama);
    setBiayaFormNominal(b.nominal.toString());
    setBiayaFormKelasId(b.kelasId);
    setBiayaFormAktif(b.aktif);
    setBiayaFormTargetKelas(b.targetKelas || '');
    setBiayaFormPrioritas(b.prioritas || 'WAJIB');
    setBiayaFormTahunAjaran(b.tahunAjaran || localStorage.getItem('ERP_academic_year') || '2026/2027');
    setIsBiayaModalOpen(true);
  };

  const handleSaveBiaya = (e: React.FormEvent) => {
    e.preventDefault();
    if (!biayaFormId || !biayaFormNama || !biayaFormNominal) {
      Swal.fire('Eror', 'Harap lengkapi Kode/ID, Nama, dan Nominal Biaya!', 'error');
      return;
    }

    const nomVal = parseFloat(biayaFormNominal.replace(/,/g, ''));
    if (isNaN(nomVal)) {
      Swal.fire('Eror', 'Nominal harus berupa angka!', 'error');
      return;
    }

    const payload: Biaya = {
      id: biayaFormId.trim(),
      nama: biayaFormNama.trim(),
      nominal: nomVal,
      kelasId: biayaFormKelasId.trim(),
      aktif: biayaFormAktif,
      targetKelas: biayaFormTargetKelas.trim(),
      prioritas: biayaFormPrioritas,
      tahunAjaran: biayaFormTahunAjaran.trim()
    };

    if (selectedBiaya) {
      // Edit existing
      db.update<any>('biaya', 'id', selectedBiaya.id, payload);
      Swal.fire('Sukses!', 'Tarif biaya berhasil diperbarui.', 'success');
    } else {
      // Insert new
      const list = db.get<Biaya>('biaya');
      if (list.some(x => x.id === payload.id)) {
        Swal.fire('Eror', 'Kode Biaya / ID sudah terdaftar!', 'error');
        return;
      }
      db.insert<any>('biaya', payload);
      Swal.fire('Sukses!', 'Tarif biaya baru berhasil ditambahkan.', 'success');
    }

    setIsBiayaModalOpen(false);
    loadAllData();
  };

  const handleDeleteBiaya = (id: string) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: `Tarif biaya dengan ID ${id} akan dihapus dari sistem.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    }).then((result: any) => {
      if (result.isConfirmed) {
        db.delete<Biaya>('biaya', 'id', id);
        Swal.fire('Dihapus!', 'Tarif biaya berhasil dihapus.', 'success');
        loadAllData();
      }
    });
  };

  const handleToggleAktifBiaya = (b: Biaya) => {
    db.update<any>('biaya', 'id', b.id, { aktif: !b.aktif });
    loadAllData();
  };

  const getFilteredBiaya = () => {
    return biayaList.filter(b => {
      const matchesSearch = b.nama.toLowerCase().includes(biayaSearch.toLowerCase()) || 
                            b.id.toLowerCase().includes(biayaSearch.toLowerCase());
      const matchesKelas = !biayaFilterKelas || b.kelasId === biayaFilterKelas || b.targetKelas === biayaFilterKelas;
      const matchesPrioritas = !biayaFilterPrioritas || b.prioritas === biayaFilterPrioritas;
      const matchesTahun = !biayaFilterTahunAjaran || (b.tahunAjaran && b.tahunAjaran.toLowerCase() === biayaFilterTahunAjaran.toLowerCase());
      return matchesSearch && matchesKelas && matchesPrioritas && matchesTahun;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Visual D3 Cash Flow Trend Chart */}
      <MonthlyCashflowD3Chart 
        pembayaranList={pembayaranList} 
        pengeluaranList={pengeluaranList} 
      />

      {/* Sub Tabs */}
      {!forceSubTab && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
          {allowedTabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-keu-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all border shrink-0 ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSubTab === 'biaya' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black uppercase">Master Tarif & Parameter Biaya</h3>
              <p className="text-xs text-blue-100 mt-1">Kelola seluruh item tagihan wajib sekolah, buku modul, LKS, seragam, kegiatan percepatan, dan PIP bantuan pemerintah.</p>
            </div>
            {['SUPERADMIN', 'ADMIN', 'BENDAHARA'].includes(user.role) && (
              <button 
                onClick={handleOpenAddBiaya}
                className="bg-white text-blue-600 hover:bg-blue-50 font-black text-xs uppercase px-4 py-3 rounded-2xl flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Tambah Tarif Biaya
              </button>
            )}
          </div>

          <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Cari nama biaya atau kode..."
                  value={biayaSearch}
                  onChange={(e) => setBiayaSearch(e.target.value)}
                  className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-2xl text-xs border focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="w-full md:w-44">
                <select
                  value={biayaFilterKelas}
                  onChange={(e) => setBiayaFilterKelas(e.target.value)}
                  className="w-full bg-slate-50 border p-2.5 rounded-2xl text-xs font-semibold text-slate-600 focus:bg-white focus:outline-none"
                >
                  <option value="">Semua Kelas</option>
                  <option value="ALL">ALL (Semua)</option>
                  {kelasList.map((k, idx) => (
                    <option key={k.id ? `${k.id}_${idx}` : `k_${idx}`} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-44">
                <select
                  value={biayaFilterTahunAjaran}
                  onChange={(e) => setBiayaFilterTahunAjaran(e.target.value)}
                  className="w-full bg-slate-50 border p-2.5 rounded-2xl text-xs font-semibold text-slate-600 focus:bg-white focus:outline-none"
                >
                  <option value="">Semua Tahun Ajaran</option>
                  {tahunAjaranList.map((t, idx) => {
                    const val = typeof t === 'string' ? t : (t.ta || t.tahun_ajaran || t.nama || t.id || `TA_${idx}`);
                    return <option key={`ta_filter_${val}_${idx}`} value={val}>{val}</option>;
                  })}
                </select>
              </div>

              <div className="w-full md:w-44">
                <select
                  value={biayaFilterPrioritas}
                  onChange={(e) => setBiayaFilterPrioritas(e.target.value)}
                  className="w-full bg-slate-50 border p-2.5 rounded-2xl text-xs font-semibold text-slate-600 focus:bg-white focus:outline-none"
                >
                  <option value="">Semua Prioritas</option>
                  <option value="WAJIB">WAJIB</option>
                  <option value="OPSIONAL">OPSIONAL</option>
                  <option value="SEKALI_BELI">SEKALI_BELI</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/70 uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4 hidden sm:table-cell">Kode / ID</th>
                    <th className="p-4">Nama Biaya</th>
                    <th className="p-4 text-right">Nominal</th>
                    <th className="p-4 text-center">Kelas Target</th>
                    <th className="p-4 text-center hidden sm:table-cell">Prioritas</th>
                    <th className="p-4 text-center hidden md:table-cell">Tahun Ajaran</th>
                    <th className="p-4 text-center">Status</th>
                    {['SUPERADMIN', 'ADMIN', 'BENDAHARA'].includes(user.role) && <th className="p-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getFilteredBiaya().length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                        <Info className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        Tidak ada tarif biaya yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    getFilteredBiaya().map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition col-span-full">
                        <td className="p-4 font-mono font-bold text-slate-500 hidden sm:table-cell">{b.id}</td>
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-slate-800">{b.nama}</p>
                            <p className="text-[9px] font-mono text-slate-400 sm:hidden">ID: {b.id}</p>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono font-black text-blue-600">{formatRupiah(b.nominal)}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-1 bg-slate-100 border text-slate-600 rounded-lg text-[10px] font-bold">
                            {b.kelasId || b.targetKelas || 'ALL'}
                          </span>
                        </td>
                        <td className="p-4 text-center hidden sm:table-cell">
                          <span className={`px-2 py-1 border rounded-lg text-[10px] font-bold ${
                            b.prioritas === 'WAJIB' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            b.prioritas === 'OPSIONAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            b.prioritas === 'SEKALI_BELI' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {b.prioritas || 'WAJIB'}
                          </span>
                        </td>
                        <td className="p-4 text-center font-semibold text-slate-500 hidden md:table-cell">{b.tahunAjaran || 'all'}</td>
                        <td className="p-4 text-center">
                          <button
                            disabled={!['SUPERADMIN', 'ADMIN', 'BENDAHARA'].includes(user.role)}
                            onClick={() => handleToggleAktifBiaya(b)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                              b.aktif 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:hover:bg-emerald-50' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:hover:bg-rose-50'
                            }`}
                          >
                            {b.aktif ? '● Aktif' : '○ Nonaktif'}
                          </button>
                        </td>
                        {['SUPERADMIN', 'ADMIN', 'BENDAHARA'].includes(user.role) && (
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditBiaya(b)}
                                className="p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition"
                                title="Edit Tarif"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteBiaya(b.id)}
                                className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition"
                                title="Hapus Tarif"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'tagihan' && (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h4 className="font-black text-slate-800 text-sm uppercase">Invoice & Tagihan Siswa</h4>
            <div className="flex gap-2">
              <button 
                onClick={exportTagihanToExcel} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 shadow"
              >
                <FileText className="w-3.5 h-3.5" /> Ekspor Excel (.xlsx)
              </button>
              <button 
                onClick={exportTagihanToPDF} 
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 shadow"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Jenis Tagihan</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-right">Terbayar</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getFilteredTagihan().map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-slate-800 text-sm">{getSiswaName(t.siswaId)}</td>
                    <td className="p-4 font-semibold text-blue-600">{t.jenis}</td>
                    <td className="p-4 text-right font-mono font-bold text-slate-700">{formatRupiah(t.total)}</td>
                    <td className="p-4 text-right font-mono text-emerald-600 font-bold">{formatRupiah(t.terbayar)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'LUNAS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'bayar' && (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50">
            <h4 className="font-black text-slate-800 text-sm uppercase">Penerimaan Kasir Sekolah</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Invoice</th>
                  <th className="p-4 text-right">Sisa Tagihan</th>
                  <th className="p-4 text-center">Proses Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getFilteredTagihan().filter(t => t.status !== 'LUNAS').map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-slate-800 text-sm">{getSiswaName(t.siswaId)}</td>
                    <td className="p-4 font-mono font-bold text-slate-500">{t.id} - {t.jenis}</td>
                    <td className="p-4 text-right font-mono font-black text-rose-600">{formatRupiah(t.total - t.terbayar)}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => {
                          setSelectedTagihan(t);
                          setBayarJumlah((t.total - t.terbayar).toString());
                          setIsBayarModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-[10px] shadow"
                      >
                        Kasir Terima Bayar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'riwayat' && (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h4 className="font-black text-slate-800 text-sm uppercase">Riwayat Log Penerimaan Kasir</h4>
            <div className="flex gap-2">
              <button 
                onClick={exportRiwayatToExcel} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 shadow"
              >
                <FileText className="w-3.5 h-3.5" /> Ekspor Excel (.xlsx)
              </button>
              <button 
                onClick={exportRiwayatToPDF} 
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 shadow"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 hidden sm:table-cell">ID Transaksi</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4 text-right">Nominal</th>
                  <th className="p-4 text-center">Metode</th>
                  <th className="p-4 hidden md:table-cell">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getFilteredPembayaran().map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-slate-600 hidden sm:table-cell">{p.id}</td>
                    <td className="p-4">
                      <div>
                        <p className="text-slate-500 font-mono">{p.tanggal}</p>
                        <p className="text-[10px] text-slate-400 font-mono sm:hidden">ID: {p.id}</p>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono font-black text-emerald-600">{formatRupiah(p.nominal)}</td>
                    <td className="p-4 text-center"><span className="bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded text-[9px]">{p.metode}</span></td>
                    <td className="p-4 text-slate-600 font-semibold hidden md:table-cell">{p.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'tabungan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          {/* Form catat transaksi tabungan (only for BENDAHARA/ADMIN/SUPERADMIN) */}
          {['BENDAHARA', 'ADMIN', 'SUPERADMIN'].includes(user.role) && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-1">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase">Catat Tabungan</h3>
                <p className="text-xs text-slate-400 mt-1">Simpan setoran tunai atau tarik tunai simpanan tabungan siswa.</p>
              </div>

              <form onSubmit={handleTabunganSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Pilih Siswa</label>
                  <select 
                    value={tabunganSiswaId} 
                    onChange={(e) => setTabunganSiswaId(e.target.value)} 
                    className="w-full bg-slate-50 border rounded-xl p-2.5 font-bold"
                  >
                    {siswaList.map((s, idx) => <option key={s.id ? `${s.id}_${idx}` : `s_${idx}`} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Transaksi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button" 
                      onClick={() => setTabunganJenis('SETOR')} 
                      className={`p-2.5 rounded-xl font-bold border transition ${
                        tabunganJenis === 'SETOR' 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                          : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      SETOR TUNAI
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setTabunganJenis('TARIK')} 
                      className={`p-2.5 rounded-xl font-bold border transition ${
                        tabunganJenis === 'TARIK' 
                          ? 'bg-rose-50 border-rose-500 text-rose-700' 
                          : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      TARIK TUNAI
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nominal (Rupiah)</label>
                  <input 
                    type="number" 
                    required 
                    value={tabunganNominal} 
                    onChange={(e) => setTabunganNominal(e.target.value)} 
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-bold" 
                    placeholder="Contoh: 50000" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Catatan / Keterangan</label>
                  <input 
                    value={tabunganCatatan} 
                    onChange={(e) => setTabunganCatatan(e.target.value)} 
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5" 
                    placeholder="Contoh: Tabungan mingguan budi" 
                  />
                </div>

                <button 
                  type="submit" 
                  className={`w-full py-3 text-white font-extrabold rounded-xl shadow-md transition ${
                    tabunganJenis === 'SETOR' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  SIMPAN TRANSAKSI
                </button>
              </form>
            </div>
          )}

          {/* Ledger view */}
          <div className={`bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 ${
            ['BENDAHARA', 'ADMIN', 'SUPERADMIN'].includes(user.role) ? 'lg:col-span-2' : 'lg:col-span-3'
          }`}>
            <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase">Buku Mutasi Tabungan</h3>
                <p className="text-xs text-slate-400 mt-1">Daftar transaksi mutasi tabungan siswa aktif.</p>
                <div className="flex gap-2 mt-2">
                  <button 
                    type="button"
                    onClick={exportTabunganToExcel} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-xl text-[10px] flex items-center gap-1 shadow-sm"
                  >
                    <FileText className="w-3 h-3" /> Excel (.xlsx)
                  </button>
                  <button 
                    type="button"
                    onClick={exportTabunganToPDF} 
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded-xl text-[10px] flex items-center gap-1 shadow-sm"
                  >
                    <Printer className="w-3 h-3" /> PDF (.pdf)
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5 text-right">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Saldo Terbuku</span>
                <span className="text-sm font-black text-blue-600 font-mono">
                  {formatRupiah(
                    getFilteredTabungan().reduce((acc, curr) => {
                      return curr.jenis === 'SETOR' ? acc + curr.nominal : acc - curr.nominal;
                    }, 0)
                  )}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Nama Siswa</th>
                    <th className="p-4 hidden sm:table-cell">Keterangan</th>
                    <th className="p-4 text-center">Jenis</th>
                    <th className="p-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {getFilteredTabungan().length > 0 ? (
                    getFilteredTabungan().map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 text-slate-500">{t.tanggal}</td>
                        <td className="p-4 font-bold text-slate-800 text-xs font-sans">{getSiswaName(t.siswaId)}</td>
                        <td className="p-4 text-slate-600 font-sans hidden sm:table-cell">{t.catatan}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.jenis === 'SETOR' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {t.jenis}
                          </span>
                        </td>
                        <td className={`p-4 text-right font-bold ${
                          t.jenis === 'SETOR' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.jenis === 'SETOR' ? '+' : '-'}{formatRupiah(t.nominal)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest font-sans">
                        KOSONG
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'pengeluaran' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-1">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm uppercase">Catat Pengeluaran Sekolah</h3>
              <p className="text-xs text-slate-400 mt-1">Catat pengeluaran tunai sekolah atau operasional rombel di sini.</p>
            </div>

            <form onSubmit={handlePengeluaranSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama / Deskripsi Pengeluaran</label>
                <input 
                  required 
                  value={expNama} 
                  onChange={(e) => setExpNama(e.target.value)} 
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" 
                  placeholder="Contoh: Membeli ATK & Kertas HVS" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nominal (Rupiah)</label>
                <input 
                  type="number" 
                  required 
                  value={expNominal} 
                  onChange={(e) => setExpNominal(e.target.value)} 
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-bold" 
                  placeholder="Contoh: 150000" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Pengeluaran</label>
                <select 
                  value={expKategori} 
                  onChange={(e) => setExpKategori(e.target.value)} 
                  className="w-full bg-slate-50 border rounded-xl p-2.5 font-bold"
                >
                  <option value="Operasional">Operasional Sekolah</option>
                  <option value="Sarpras">Sarana & Prasarana</option>
                  <option value="Gaji">Gaji / Honor Guru</option>
                  <option value="Kegiatan">Kegiatan Siswa</option>
                  <option value="Bulanan">Biaya Bulanan (Listrik/Wifi)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md transition"
              >
                SIMPAN PENGELUARAN
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 lg:col-span-2">
            <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase">Daftar Pengeluaran Terdaftar</h3>
                <p className="text-xs text-slate-400 mt-1">Daftar pengeluaran tunai operasional sekolah berjalan.</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-2.5 text-right">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Pengeluaran</span>
                <span className="text-sm font-black text-rose-600 font-mono">
                  {formatRupiah(pengeluaranList.reduce((acc, curr) => acc + curr.nominal, 0))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">ID</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Deskripsi Pengeluaran</th>
                    <th className="p-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {pengeluaranList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-slate-500">{e.tanggal}</td>
                      <td className="p-4 font-bold text-slate-600">{e.id}</td>
                      <td className="p-4 font-bold text-slate-600"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-sans text-[10px]">{e.kategori}</span></td>
                      <td className="p-4 text-slate-800 font-bold font-sans text-xs">{e.deskripsi}</td>
                      <td className="p-4 text-right text-rose-600 font-bold">{formatRupiah(e.nominal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'jurnal' && (
        <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Buku Jurnal Umum Sekolah</h3>
            <p className="text-xs text-slate-400 mt-1">Sistem pencatatan double-entry debit dan kredit keuangan bulanan rombel.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Akun Rekening</th>
                  <th className="p-4 text-right text-emerald-600">Debit (Kas Masuk)</th>
                  <th className="p-4 text-right text-rose-600">Kredit (Kas Keluar)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {[
                  { tanggal: '2026-07-10', akun: 'Kas Masuk SPP (Siswa)', debit: 45000000, kredit: 0 },
                  { tanggal: '2026-07-08', akun: 'Belanja Operasional ATK Rombel', debit: 0, kredit: 450000 },
                  { tanggal: '2026-07-05', akun: 'Pembayaran Rekening Listrik & Internet', debit: 0, kredit: 1200000 }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-slate-500">{row.tanggal}</td>
                    <td className="p-4 font-bold text-slate-800">{row.akun}</td>
                    <td className="p-4 text-right text-emerald-600 font-bold">{row.debit > 0 ? formatRupiah(row.debit) : '-'}</td>
                    <td className="p-4 text-right text-rose-600 font-bold">{row.kredit > 0 ? formatRupiah(row.kredit) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'laporan' && (
        <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase">Laporan Neraca & Laba Rugi</h3>
              <p className="text-xs text-slate-400 mt-1">Unduh rekapitulasi realisasi anggaran sekolah terdaftar offline.</p>
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={exportFinancialReportToExcel} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <FileText className="w-4 h-4" /> Ekspor Neraca (.xlsx)
              </button>
              <button 
                type="button"
                onClick={exportFinancialReportToPDF} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" /> Cetak Laporan (.pdf)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="border rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <h5 className="font-bold text-slate-700 text-xs uppercase border-b pb-1.5">Aset Lancar (Neraca)</h5>
              <div className="space-y-1 font-semibold text-slate-600">
                <div className="flex justify-between"><span>Kas Utama Sekolah</span><span className="font-mono text-slate-800">{formatRupiah(72100000)}</span></div>
                <div className="flex justify-between"><span>Piutang SPP Siswa</span><span className="font-mono text-slate-800">{formatRupiah(12400000)}</span></div>
                <div className="flex justify-between border-t pt-1 font-bold text-slate-900"><span>Total Aset Lancar</span><span className="font-mono">{formatRupiah(84500000)}</span></div>
              </div>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <h5 className="font-bold text-slate-700 text-xs uppercase border-b pb-1.5">Laba / Rugi Operasional</h5>
              <div className="space-y-1 font-semibold text-slate-600">
                <div className="flex justify-between"><span>Total Pemasukan Pendidikan</span><span className="font-mono text-emerald-600">{formatRupiah(84500000)}</span></div>
                <div className="flex justify-between"><span>Total Biaya Operasional & Gaji</span><span className="font-mono text-rose-600">({formatRupiah(1650000)})</span></div>
                <div className="flex justify-between border-t pt-1 font-bold text-slate-900"><span>Surplus Bersih</span><span className="font-mono text-blue-600">{formatRupiah(82850000)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KASIR PEMBAYARAN MODAL */}
      {isBayarModalOpen && selectedTagihan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 relative border animate-fade-in-up">
            <button 
              onClick={() => setIsBayarModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              &times;
            </button>
            <h3 className="font-extrabold text-slate-800 text-lg border-b pb-3 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" /> Proses Transaksi Kasir
            </h3>

            <form onSubmit={handlePembayaranSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-1">
                <p><span className="text-slate-400 font-semibold inline-block w-24">Siswa</span>: <b className="text-slate-800">{getSiswaName(selectedTagihan.siswaId)}</b></p>
                <p><span className="text-slate-400 font-semibold inline-block w-24">Tagihan</span>: <b className="text-slate-800">{selectedTagihan.jenis}</b></p>
                <p><span className="text-slate-400 font-semibold inline-block w-24">Sisa Tagihan</span>: <b className="text-rose-600 font-mono text-sm">{formatRupiah(selectedTagihan.total - selectedTagihan.terbayar)}</b></p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Jumlah Pembayaran (Nominal)</label>
                <input 
                  type="text" 
                  required 
                  value={bayarJumlah} 
                  onChange={(e) => setBayarJumlah(e.target.value)} 
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-bold focus:bg-white text-sm" 
                  placeholder="Contoh: 500000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-semibold">Metode Pembayaran</label>
                <select value={bayarMetode} onChange={(e: any) => setBayarMetode(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 font-bold">
                  <option value="CASH">Cash / Tunai</option>
                  <option value="TRANSFER">Transfer Bank</option>
                  <option value="TABUNGAN">Potong Tabungan Siswa</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Catatan / Referensi</label>
                <textarea value={bayarCatatan} onChange={(e) => setBayarCatatan(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5" rows={2} placeholder="Sebutkan catatan, No Slip Transfer atau nama penyetor..."></textarea>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setIsBayarModalOpen(false)} className="px-5 py-2.5 rounded-xl border text-slate-600 font-bold hover:bg-slate-50">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md">Simpan Pelunasan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Biaya */}
      {isBiayaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border p-6 space-y-4 my-8 relative">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-800">
                {selectedBiaya ? 'Edit Tarif Biaya' : 'Tambah Tarif Biaya Baru'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsBiayaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveBiaya} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kode Biaya / ID</label>
                  <input 
                    type="text" 
                    required 
                    disabled={!!selectedBiaya}
                    value={biayaFormId} 
                    onChange={(e) => setBiayaFormId(e.target.value)} 
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold focus:bg-white disabled:opacity-65" 
                    placeholder="Contoh: A4_Modul"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun Ajaran</label>
                  <select 
                    value={biayaFormTahunAjaran} 
                    onChange={(e) => setBiayaFormTahunAjaran(e.target.value)} 
                    className="w-full bg-slate-50 border rounded-xl p-2.5 font-semibold focus:bg-white text-xs"
                  >
                    <option value="all">all (Semua Tahun)</option>
                    {tahunAjaranList.map((t, idx) => {
                      const val = typeof t === 'string' ? t : (t.ta || t.tahun_ajaran || t.nama || t.id || `TA_${idx}`);
                      return <option key={`ta_form_${val}_${idx}`} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Tarif Biaya</label>
                <input 
                  type="text" 
                  required 
                  value={biayaFormNama} 
                  onChange={(e) => setBiayaFormNama(e.target.value)} 
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold focus:bg-white" 
                  placeholder="Contoh: Buku Modul A4"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nominal (Rupiah)</label>
                  <input 
                    type="text" 
                    required 
                    value={biayaFormNominal} 
                    onChange={(e) => setBiayaFormNominal(e.target.value)} 
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold font-mono focus:bg-white" 
                    placeholder="Contoh: 170000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Prioritas Ketentuan</label>
                  <select 
                    value={biayaFormPrioritas} 
                    onChange={(e: any) => setBiayaFormPrioritas(e.target.value)} 
                    className="w-full bg-slate-50 border rounded-xl p-2.5 font-semibold focus:bg-white"
                  >
                    <option value="WAJIB">WAJIB (Wajib Bayar)</option>
                    <option value="OPSIONAL">OPSIONAL (Pilihan)</option>
                    <option value="SEKALI_BELI">SEKALI_BELI (Sekali Beli)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-semibold">Kelas Target</label>
                  <select 
                    value={biayaFormKelasId || biayaFormTargetKelas} 
                    onChange={(e: any) => {
                      const val = e.target.value;
                      setBiayaFormKelasId(val === 'ALL' ? '' : val);
                      setBiayaFormTargetKelas(val);
                    }} 
                    className="w-full bg-slate-50 border rounded-xl p-2.5 font-semibold focus:bg-white"
                  >
                    <option value="ALL">ALL (Berlaku Semua Kelas)</option>
                    {kelasList.map((k, idx) => (
                      <option key={k.id ? `${k.id}_form_${idx}` : `k_form_${idx}`} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-semibold">Status Awal</label>
                  <select 
                    value={biayaFormAktif ? 'true' : 'false'} 
                    onChange={(e: any) => setBiayaFormAktif(e.target.value === 'true')} 
                    className="w-full bg-slate-50 border rounded-xl p-2.5 font-semibold focus:bg-white"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setIsBiayaModalOpen(false)} className="px-5 py-2.5 rounded-xl border text-slate-600 font-bold hover:bg-slate-50">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md">
                  {selectedBiaya ? 'Simpan Perubahan' : 'Tambah Tarif'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

declare const Swal: any;
export {};
