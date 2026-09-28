import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, X, Save, Layers, Search, FileSpreadsheet, 
  UserCheck, Users, RefreshCw, Download, Sparkles, Check, ArrowRight,
  DollarSign, Tag, GraduationCap, Calendar, CheckSquare, Info, User, UploadCloud, RotateCcw
} from 'lucide-react';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { autoSyncEngine } from '../../data/autoSyncEngine';
import { KeuanganBiaya, KeuanganKelas, MASTER_BIAYA_ROMBEL_37, seedRealBiayaMaster } from '../../data/keuanganSeed';
import { exportToExcel } from '../../lib/excel';
import { getAllClasses, formatClassLabel, matchClass, normalizeClassName } from '../../lib/utils';
import { fetchFromGAS } from '../../lib/api';
import { getStoredGasUrl, isValidGasUrl, pullAllSheetsFromGas, pullSpecificSheetFromGas } from '../../utils/gasSync';
import CustomDropdown, { DropdownOption } from '../common/CustomDropdown';
import Swal from 'sweetalert2';

// Helper to check if a fee item is applicable for a given class
export function isBiayaApplicableForClass(biayaTargetKelas: string | null | undefined, studentKelas: string | null | undefined): boolean {
  if (!studentKelas) return true;
  const target = String(biayaTargetKelas || 'Semua Kelas').trim();
  if (!target || target === 'Semua' || target === 'Semua Kelas' || target === 'Semua Jenjang' || target === 'ALL' || target === '') {
    return true;
  }
  return matchClass(studentKelas, target);
}

// Dropdown constants matching Sheet BIAYA specs
const KATEGORI_OPTIONS: DropdownOption[] = [
  { value: 'Modul/Buku', label: 'Modul / Buku', badge: 'Bahan Ajar' },
  { value: 'Baju', label: 'Baju Seragam', badge: 'Atribut' },
  { value: 'PIP', label: 'PIP (Program Indonesia Pintar)', badge: 'Bantuan' },
  { value: 'Percepatan', label: 'Percepatan', badge: 'Program Khusus' },
  { value: 'Iuran', label: 'Iuran', badge: 'Bulanan/SPP' },
  { value: 'Uang Pangkal', label: 'Uang Pangkal', badge: 'DSP/Gedung' },
  { value: 'Uang Seragam', label: 'Uang Seragam', badge: 'Atribut' },
  { value: 'Uang Gedung', label: 'Uang Gedung', badge: 'Sarpras' },
  { value: 'Kegiatan', label: 'Kegiatan', badge: 'Ekstra/Outing' },
  { value: 'Ujian', label: 'Ujian', badge: 'CBT/Asesmen' },
  { value: 'Lain-lain', label: 'Lain-lain', badge: 'Umum' },
];

const JENJANG_OPTIONS: DropdownOption[] = [
  { value: 'Semua Jenjang', label: 'Semua Jenjang', badge: 'Universal' },
  { value: 'Paket A', label: 'Paket A (Setara SD)', badge: 'Setara SD' },
  { value: 'Paket B', label: 'Paket B (Setara SMP)', badge: 'Setara SMP' },
  { value: 'Paket C', label: 'Paket C (Setara SMA)', badge: 'Setara SMA' },
  { value: 'SD', label: 'SD', badge: 'Formal SD' },
  { value: 'SMP', label: 'SMP', badge: 'Formal SMP' },
  { value: 'SMA', label: 'SMA', badge: 'Formal SMA' },
];

const PERIODE_OPTIONS: DropdownOption[] = [
  { value: 'Tahunan', label: 'Tahunan', badge: 'Sekali Setahun' },
  { value: 'Sekali Bayar', label: 'Sekali Bayar', badge: 'Awal Masuk' },
  { value: 'Bulanan', label: 'Bulanan', badge: 'Rutin Per Bulan' },
  { value: 'Semester', label: 'Semester', badge: 'Per 6 Bulan' },
  { value: 'OPSIONAL', label: 'OPSIONAL', badge: 'Fleksibel' },
  { value: 'Insidental', label: 'Insidental', badge: 'Kondisional' },
];

const WAJIB_OPTIONS: DropdownOption[] = [
  { value: 'Wajib', label: 'Wajib', badge: 'Kewajiban Pokok' },
  { value: 'Pilihan', label: 'Pilihan', badge: 'Opsional Siswa' },
  { value: 'Sukarela', label: 'Sukarela', badge: 'Infaq / Donasi' },
];

const STATUS_OPTIONS: DropdownOption[] = [
  { value: 'AKTIF', label: 'AKTIF', badge: 'Dapat Ditagihkan' },
  { value: 'NONAKTIF', label: 'NONAKTIF', badge: 'Nonaktif / Arsip' },
];

const FILTER_KATEGORI_OPTIONS: DropdownOption[] = [
  { value: '', label: 'Semua Kategori' },
  { value: 'Percepatan', label: 'Percepatan (Program Khusus)' },
  { value: 'Iuran', label: 'Iuran' },
  { value: 'Kegiatan', label: 'Kegiatan' },
  { value: 'Seragam', label: 'Seragam' },
  { value: 'Ujian', label: 'Ujian' },
  { value: 'Gedung', label: 'Gedung' },
  { value: 'Raport', label: 'Raport' },
  { value: 'Modul/Buku', label: 'Modul / Buku' },
  { value: 'WAJIB', label: 'Wajib' },
  { value: 'OPSIONAL', label: 'Opsional' },
  { value: 'PIP', label: 'PIP' },
  { value: 'Lainnya', label: 'Lainnya' },
];

const QUICK_NOMINALS = [50000, 100000, 150000, 250000, 350000, 500000, 1000000];

// Helper to normalize and map raw row from Sheet BIAYA / Excel
export function normalizeBiayaRow(item: any, idx: number): KeuanganBiaya {
  const id = item.BiayaID || item.biayaId || item.id || `BYA_${Date.now()}_${idx}`;
  const kode = item.KodeBiaya || item.kodeBiaya || item.kode || `BYA-${String(idx + 1).padStart(3, '0')}`;
  const nama = item.NamaBiaya || item.namaBiaya || item.namaPos || item.nama || item.posBiaya || `Pos Biaya ${idx + 1}`;
  
  let rawNominal = item.Nominal ?? item.nominal ?? item.tarif ?? item.jumlah ?? 0;
  if (typeof rawNominal === 'string') {
    rawNominal = Number(rawNominal.replace(/[^0-9.-]+/g, '')) || 0;
  }
  const nominal = Number(rawNominal) || 0;

  const kategori = item.Kategori || item.kategori || 'Iuran';
  const jenjang = item.Jenjang || item.jenjang || 'Semua Jenjang';
  const targetKelas = item.Target_Kelas || item.targetKelas || item.TargetKelas || item.kelas || item.kelasNama || 'Semua Kelas';
  const kelasId = item.KelasID || item.kelasId || '';
  const siswaId = item.SiswaID || item.siswaId || '';
  const namaSiswa = item.NamaSiswa || item.namaSiswa || 'Semua Siswa';
  const periode = item.Periode || item.periode || item.frekuensi || 'Bulanan';
  const wajib = item.Wajib || item.wajib || item.statusWajib || 'Wajib';
  const statusRaw = item.Status || item.status || (item.aktif !== false ? 'AKTIF' : 'NONAKTIF');
  const status = String(statusRaw).toUpperCase().includes('NON') ? 'NONAKTIF' : 'AKTIF';
  const keterangan = item.Keterangan || item.keterangan || item.deskripsi || '';

  return {
    id,
    biayaId: id,
    kodeBiaya: kode,
    nama,
    namaBiaya: nama,
    kategori,
    jenjang,
    targetKelas,
    kelasId,
    kelasNama: targetKelas,
    siswaId,
    namaSiswa: siswaId ? namaSiswa : 'Semua Siswa',
    nominal,
    periode,
    wajib,
    status,
    aktif: status === 'AKTIF',
    keterangan,
    createdAt: item.CreatedAt || item.createdAt || new Date().toISOString(),
    updatedAt: item.UpdatedAt || item.updatedAt || new Date().toISOString(),
  };
}

// Formatter to serialize KeuanganBiaya into standard Google Sheets BIAYA headers (17 kolom resmi)
export function formatBiayaForSheet(b: KeuanganBiaya, idx: number) {
  const nom = Number(b.nominal) || 0;
  const stat = b.status || (b.aktif !== false ? 'AKTIF' : 'NONAKTIF');
  return {
    No: idx + 1,
    BiayaID: b.biayaId || b.id || `BYA_${idx + 1}`,
    KodeBiaya: b.kodeBiaya || b.id || `BYA-${String(idx + 1).padStart(3, '0')}`,
    NamaBiaya: b.namaBiaya || b.nama,
    Kategori: b.kategori || 'Iuran',
    Jenjang: b.jenjang || 'Semua Jenjang',
    Target_Kelas: b.targetKelas || b.kelasNama || 'Semua Kelas',
    KelasID: b.kelasId || '',
    SiswaID: b.siswaId || '',
    NamaSiswa: b.namaSiswa || 'Semua Siswa',
    Nominal: nom,
    Periode: b.periode || 'Bulanan',
    Wajib: b.wajib || 'Wajib',
    Status: stat,
    Keterangan: b.keterangan || '',
    CreatedAt: b.createdAt || new Date().toISOString(),
    UpdatedAt: b.updatedAt || new Date().toISOString(),
  };
}

export default function MasterBiayaTab() {
  const { students, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [isPullingGas, setIsPullingGas] = useState(false);
  const [lastPulledAt, setLastPulledAt] = useState<string | null>(null);
  const [isSyncedFromSheet, setIsSyncedFromSheet] = useState(false);

  const availableClasses = useMemo(() => getAllClasses(students), [students]);

  const [biayaList, setBiayaList] = useState<KeuanganBiaya[]>(() => {
    const existing = db.get<KeuanganBiaya>('keuangan_biaya') || [];
    if (existing.length > 0) return existing;

    // Check if 'tarif' or 'BIAYA' has data in db
    const tarifDb = db.get<any>('tarif') || [];
    const sheetBiayaDb = db.get<any>('BIAYA') || [];
    const source = sheetBiayaDb.length > 0 ? sheetBiayaDb : tarifDb;

    if (source.length > 0) {
      const converted = source.map(normalizeBiayaRow);
      db.set('keuangan_biaya', converted);
      return converted;
    }

    return [];
  });

  const saveBiayaToDb = (newList: KeuanganBiaya[]) => {
    setBiayaList(newList);
    db.set('keuangan_biaya', newList);
    db.set('BIAYA', newList);
    db.set('tarif', newList.map(b => ({
      id: b.id,
      kode: b.kodeBiaya || b.id,
      namaPos: b.namaBiaya || b.nama,
      frekuensi: b.periode || 'Bulanan',
      nominal: b.nominal,
      kelas: b.targetKelas || 'Semua Kelas',
      status: b.wajib || 'Wajib'
    })));
  };

  // Pull directly from Google Sheets (Sheet: BIAYA)
  const handlePullFromGas = async (silent = false) => {
    const gasUrl = (settings?.gasUrl || settings?.scriptUrl || getStoredGasUrl() || '').trim();
    if (!isValidGasUrl(gasUrl)) {
      if (!silent) {
        Swal.fire({
          icon: 'warning',
          title: 'URL Google Apps Script Belum Diatur',
          html: `
            <p class="text-xs text-slate-600 mb-2">Untuk menyinkronkan langsung dengan Google Spreadsheet secara online, silakan masukkan URL Google Apps Script Web App Anda pada menu Pengaturan Akun / Database.</p>
          `,
          confirmButtonColor: '#059669',
          confirmButtonText: 'Mengerti'
        });
      }
      return;
    }

    setIsPullingGas(true);
    try {
      let remoteBiaya: any[] = [];
      const fastRes = await pullSpecificSheetFromGas('BIAYA', gasUrl);
      if (fastRes.success && Array.isArray(fastRes.data) && fastRes.data.length > 0) {
        remoteBiaya = fastRes.data;
      } else {
        const res = await pullAllSheetsFromGas(gasUrl);
        if (res.success && res.data) {
          remoteBiaya = res.data.BIAYA || res.data.biaya || res.data.TARIF || res.data.tarif || [];
        }
      }

      if (Array.isArray(remoteBiaya) && remoteBiaya.length > 0) {
        const converted = remoteBiaya.map((row: any, idx: number) => normalizeBiayaRow(row, idx));
        saveBiayaToDb(converted);
        setIsSyncedFromSheet(true);
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        setLastPulledAt(timeStr);

        if (!silent) {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Tarik dari Sheet BIAYA!',
            text: `Memuat ${converted.length} pos tarif biaya langsung dari Sheet BIAYA Google Spreadsheet.`,
            timer: 2000,
            showConfirmButton: false
          });
        }
      } else {
        if (!silent) {
          Swal.fire({
            icon: 'info',
            title: 'Sheet BIAYA Kosong',
            text: 'Sheet BIAYA pada Google Spreadsheet belum memiliki data baris.',
            confirmButtonColor: '#059669'
          });
        }
      }
    } catch (err: any) {
      console.warn('Pull BIAYA from GAS error:', err);
      if (!silent) {
        Swal.fire({
          icon: 'error',
          title: 'Kendala Jaringan',
          text: 'Gagal menarik data dari Google Apps Script: ' + (err.message || String(err)),
          confirmButtonColor: '#059669'
        });
      }
    } finally {
      setIsPullingGas(false);
    }
  };

  const handleLoadMaster38 = () => {
    seedRealBiayaMaster(true);
    const updated = db.get<KeuanganBiaya>('keuangan_biaya') || [];
    setBiayaList(updated);
    Swal.fire({
      icon: 'success',
      title: '38 Pos Tarif Resmi Dimuat',
      text: 'Berhasil menerapkan 38 pos Master Tarif resmi KTCT Tambora.',
      confirmButtonColor: '#059669'
    });
  };

  const [isPushingGas, setIsPushingGas] = useState(false);
  const handlePushToGas = async () => {
    const gasUrl = (settings?.gasUrl || settings?.scriptUrl || getStoredGasUrl() || '').trim();
    if (!isValidGasUrl(gasUrl)) {
      Swal.fire({
        icon: 'warning',
        title: 'URL Google Apps Script Belum Diatur',
        text: 'Silakan atur URL Google Apps Script Web App pada menu Pengaturan Akun / Database.',
        confirmButtonColor: '#059669'
      });
      return;
    }

    setIsPushingGas(true);
    try {
      const res = await autoSyncEngine.pushSpecificTables(['BIAYA']);
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Tersinkron ke Spreadsheet!',
          text: `Berhasil mengirim dan menyinkronkan data pos tarif ke Sheet BIAYA di Google Spreadsheet.`,
          confirmButtonColor: '#059669',
          timer: 2500
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyinkronkan',
          text: res.message || 'Terjadi kesalahan saat sinkronisasi ke Google Spreadsheet.',
          confirmButtonColor: '#059669'
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Kendala Jaringan',
        text: err?.message || 'Gagal mengirim data ke Google Spreadsheet.',
        confirmButtonColor: '#059669'
      });
    } finally {
      setIsPushingGas(false);
    }
  };

  useEffect(() => {
    const handleClear = () => {
      const latest = db.get<KeuanganBiaya>('keuangan_biaya') || [];
      setBiayaList(latest);
    };
    const handleDbUpdated = (e: any) => {
      const key = e.detail?.key;
      if (!key || key === 'keuangan_biaya' || key === 'tarif' || key === 'BIAYA' || key === 'keuangan_all') {
        const latest = db.get<any>('keuangan_biaya') || db.get<any>('BIAYA') || db.get<any>('tarif') || [];
        if (latest.length > 0) {
          setBiayaList(latest.map((b: any, i: number) => normalizeBiayaRow(b, i)));
          setIsSyncedFromSheet(true);
        }
      }
    };
    window.addEventListener('erp-keuangan-cleared', handleClear);
    window.addEventListener('erp-db-updated', handleDbUpdated);
    return () => {
      window.removeEventListener('erp-keuangan-cleared', handleClear);
      window.removeEventListener('erp-db-updated', handleDbUpdated);
    };
  }, []);

  const [kelasList] = useState<KeuanganKelas[]>(() => {
    return db.get<KeuanganKelas>('keuangan_kelas') || [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KeuanganBiaya | null>(null);

  // Form State matching sheet fields
  const [formData, setFormData] = useState({
    kodeBiaya: 'BYA-01',
    namaBiaya: '',
    kategori: 'Iuran',
    jenjang: 'Semua Jenjang',
    targetKelas: 'Semua Kelas',
    kelasId: '',
    nominal: 150000,
    periode: 'Bulanan',
    wajib: 'Wajib',
    status: 'AKTIF',
    keterangan: '',
  });

  // Daftar kelas resmi PKBM KTCT Tambora ter-normalisasi (Paket A: 4-6, Paket B: 7-9, Paket C: 10-12)
  const normalizedOfficialClasses = useMemo(() => {
    const cleanSet = new Set<string>(['4', '5', '6', '7', '8', '9', '10', '11', '12']);
    availableClasses.forEach(c => {
      const clean = normalizeClassName(c);
      if (clean && clean !== 'None' && clean !== 'Tanpa Kelas') {
        const num = parseInt(clean.replace(/\D/g, ''), 10);
        if (num >= 4 && num <= 12) {
          cleanSet.add(clean);
        }
      }
    });
    return Array.from(cleanSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [availableClasses]);

  const kelasOptions: DropdownOption[] = useMemo(() => [
    { value: '', label: 'Semua Kelas (Umum)', badge: 'Semua Rombel' },
    ...normalizedOfficialClasses.map(c => {
      const num = parseInt(c.replace(/\D/g, ''), 10);
      let paket = 'Paket A';
      if (num >= 7 && num <= 9) paket = 'Paket B';
      else if (num >= 10 && num <= 12) paket = 'Paket C';
      return {
        value: formatClassLabel(c),
        label: `${formatClassLabel(c)} (${paket})`,
        badge: paket
      };
    })
  ], [normalizedOfficialClasses]);

  const filterKelasOptions: DropdownOption[] = useMemo(() => [
    { value: '', label: 'Semua Rombel' },
    ...normalizedOfficialClasses.map(c => {
      const num = parseInt(c.replace(/\D/g, ''), 10);
      let paket = 'Paket A';
      if (num >= 7 && num <= 9) paket = 'Paket B';
      else if (num >= 10 && num <= 12) paket = 'Paket C';
      return {
        value: c,
        label: `${formatClassLabel(c)} (${paket})`,
        badge: paket
      };
    })
  ], [normalizedOfficialClasses]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      kodeBiaya: `BYA-${String(biayaList.length + 1).padStart(3, '0')}`,
      namaBiaya: '',
      kategori: 'Iuran',
      jenjang: 'Semua Jenjang',
      targetKelas: 'Semua Kelas',
      kelasId: '',
      nominal: 150000,
      periode: 'Bulanan',
      wajib: 'Wajib',
      status: 'AKTIF',
      keterangan: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: KeuanganBiaya) => {
    setEditingItem(item);
    setFormData({
      kodeBiaya: item.kodeBiaya || item.id || '',
      namaBiaya: item.namaBiaya || item.nama || '',
      kategori: item.kategori || 'Iuran',
      jenjang: item.jenjang || 'Semua Jenjang',
      targetKelas: item.targetKelas || item.kelasNama || 'Semua Kelas',
      kelasId: item.kelasId || '',
      nominal: Number(item.nominal) || 0,
      periode: item.periode || 'Bulanan',
      wajib: item.wajib || 'Wajib',
      status: item.status || (item.aktif !== false ? 'AKTIF' : 'NONAKTIF'),
      keterangan: item.keterangan || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, bItem?: KeuanganBiaya) => {
    const targetId = bItem?.biayaId || bItem?.id || id;
    const name = bItem?.namaBiaya || 'pos biaya ini';

    Swal.fire({
      title: 'Hapus Pos Tarif Biaya?',
      html: `Apakah Anda yakin ingin menghapus <b>${name}</b>?<br><span class="text-xs text-rose-600 font-semibold">Data pos biaya akan dihapus dari daftar master tarif.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = biayaList.filter(b => b.id !== targetId && b.biayaId !== targetId);
        saveBiayaToDb(updated);

        const scriptUrl = (settings?.gasUrl || settings?.scriptUrl || getStoredGasUrl() || '').trim();
        if (isValidGasUrl(scriptUrl)) {
          const spreadsheetId = settings?.spreadsheetId;
          fetchFromGAS(scriptUrl, {
            action: 'syncData',
            table: 'BIAYA',
            data: updated.map(formatBiayaForSheet),
            spreadsheetId
          }).catch(err => console.warn('Sync BIAYA delete to GAS error:', err));
        }

        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: 'Pos biaya berhasil dihapus.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaBiaya.trim()) {
      alert('Nama pos biaya harus diisi');
      return;
    }

    const selectedKelasObj = kelasList.find(k => k.id === formData.kelasId);
    const targetKelas = formData.kelasId ? (selectedKelasObj?.nama || formData.kelasId) : 'Semua Kelas';

    let updatedBiayaList: KeuanganBiaya[] = [];

    if (editingItem) {
      updatedBiayaList = biayaList.map(b => b.id === editingItem.id ? {
        ...b,
        kodeBiaya: formData.kodeBiaya,
        nama: formData.namaBiaya,
        namaBiaya: formData.namaBiaya,
        kategori: formData.kategori,
        jenjang: formData.jenjang,
        targetKelas,
        kelasId: formData.kelasId,
        kelasNama: targetKelas,
        siswaId: b.siswaId || '-',
        namaSiswa: b.namaSiswa || 'Semua Siswa',
        nominal: formData.nominal,
        periode: formData.periode,
        wajib: formData.wajib,
        status: formData.status,
        aktif: formData.status === 'AKTIF',
        keterangan: formData.keterangan,
        updatedAt: new Date().toISOString(),
      } : b);
    } else {
      const newId = `BYA_${Date.now()}`;
      const newItem: KeuanganBiaya = {
        id: newId,
        biayaId: newId,
        kodeBiaya: formData.kodeBiaya,
        nama: formData.namaBiaya,
        namaBiaya: formData.namaBiaya,
        kategori: formData.kategori,
        jenjang: formData.jenjang,
        targetKelas,
        kelasId: formData.kelasId,
        kelasNama: targetKelas,
        siswaId: '-',
        namaSiswa: 'Semua Siswa',
        nominal: formData.nominal,
        periode: formData.periode,
        wajib: formData.wajib,
        status: formData.status,
        aktif: formData.status === 'AKTIF',
        keterangan: formData.keterangan,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedBiayaList = [...biayaList, newItem];
    }

    saveBiayaToDb(updatedBiayaList);
    setIsModalOpen(false);

    // Sync to GAS in background with proper sheet headers
    const scriptUrl = (settings?.gasUrl || settings?.scriptUrl || getStoredGasUrl() || '').trim();
    if (isValidGasUrl(scriptUrl)) {
      const spreadsheetId = settings?.spreadsheetId;
      fetchFromGAS(scriptUrl, {
        action: 'syncData',
        table: 'BIAYA',
        data: updatedBiayaList.map(formatBiayaForSheet),
        spreadsheetId
      }).catch(err => console.warn('Sync BIAYA save to GAS error:', err));
    }
  };

  const filteredBiaya = useMemo(() => {
    return biayaList.filter(b => {
      const q = searchTerm.toLowerCase();
      const nama = String(b.namaBiaya || b.nama || '').toLowerCase();
      const kode = String(b.kodeBiaya || b.id || '').toLowerCase();
      const kat = String(b.kategori || '').toLowerCase();
      const siswa = String(b.namaSiswa || '').toLowerCase();
      const matchesQ = !searchTerm || nama.includes(q) || kode.includes(q) || kat.includes(q) || siswa.includes(q);
      
      let matchesKat = true;
      if (filterKategori) {
        if (filterKategori.toLowerCase() === 'percepatan') {
          matchesKat = kat.includes('percepatan') || nama.includes('percepatan') || kode.includes('percepatan');
        } else {
          matchesKat = b.kategori === filterKategori;
        }
      }

      // Pos biaya berlaku jika cocok dengan kelas terpilih (pos universal 'Semua Kelas' atau spesifik kelas)
      const matchesKelas = !filterKelas || isBiayaApplicableForClass(b.kelasNama || b.targetKelas || '', filterKelas);
      return matchesQ && matchesKat && matchesKelas;
    });
  }, [biayaList, searchTerm, filterKategori, filterKelas]);

  const handleExportExcel = () => {
    if (biayaList.length === 0) {
      alert("Belum ada data pos biaya untuk diekspor.");
      return;
    }
    const rows = biayaList.map((b, idx) => ({
      No: idx + 1,
      BiayaID: b.biayaId || b.id,
      KodeBiaya: b.kodeBiaya || b.id,
      NamaBiaya: b.namaBiaya || b.nama,
      Kategori: b.kategori || 'Iuran',
      Jenjang: b.jenjang || 'Semua Jenjang',
      Target_Kelas: b.targetKelas || b.kelasNama || 'Semua Kelas',
      KelasID: b.kelasId || '-',
      SiswaID: b.siswaId || '-',
      NamaSiswa: b.namaSiswa || 'Semua Siswa',
      Nominal: b.nominal,
      Periode: b.periode || 'Bulanan',
      Wajib: b.wajib || 'Wajib',
      Status: b.status || (b.aktif !== false ? 'AKTIF' : 'NONAKTIF'),
      Keterangan: b.keterangan || '-',
      CreatedAt: b.createdAt || '-',
      UpdatedAt: b.updatedAt || '-'
    }));
    exportToExcel(rows, `Master_Tarif_Biaya_${new Date().toISOString().slice(0, 10)}.xlsx`, 'BIAYA');
  };

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  const hasActiveFilter = Boolean(searchTerm || filterKategori || filterKelas);

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Top Header & Actions Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers size={20} className="text-emerald-600" />
              Tarif &amp; Pos Biaya
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengaturan komponen biaya, pos pembayaran sekolah, tarif SPP bulanan, dan iuran siswa terintegrasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Tambah Pos Biaya</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pos Biaya */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {hasActiveFilter ? 'Pos Terfilter' : 'Total Pos Biaya'}
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {(hasActiveFilter ? filteredBiaya.length : biayaList.length).toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500">
              {hasActiveFilter ? `dari ${biayaList.length} total tarif` : 'Komponen Tarif Sekolah'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Layers size={20} />
          </div>
        </div>

        {/* Card 2: Pos Biaya Aktif */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Pos Biaya Aktif
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {biayaList.filter(b => b.status === 'AKTIF' || b.aktif !== false).length}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <Check size={13} />
              Berlaku &amp; Ditagihkan
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Check size={20} />
          </div>
        </div>

        {/* Card 3: Variasi Kategori */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Kategori Biaya
            </span>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {Array.from(new Set(biayaList.map(b => b.kategori).filter(Boolean))).length}
            </div>
            <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <Tag size={13} />
              Iuran, Modul &amp; Seragam
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Tag size={20} />
          </div>
        </div>

        {/* Card 4: Akumulasi Tarif */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Akumulasi Tarif
            </span>
            <div className="text-2xl font-black text-blue-700 font-mono">
              {fmtRp(biayaList.reduce((acc, b) => acc + (Number(b.nominal) || 0), 0))}
            </div>
            <p className="text-[11px] text-blue-600 font-medium truncate max-w-[180px]">
              Total Nominal Master
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama biaya, kode, siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="w-full sm:w-44">
            <CustomDropdown
              value={filterKategori}
              onChange={(val) => setFilterKategori(val)}
              options={FILTER_KATEGORI_OPTIONS}
              placeholder="Semua Kategori"
              buttonClassName="py-2 bg-slate-50 border-slate-200 text-xs font-bold"
            />
          </div>

          <div className="w-full sm:w-44">
            <CustomDropdown
              value={filterKelas}
              onChange={(val) => setFilterKelas(val)}
              options={filterKelasOptions}
              placeholder="Semua Rombel"
              searchable
              buttonClassName="py-2 bg-slate-50 border-slate-200 text-xs font-bold"
            />
          </div>

          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKategori('');
                setFilterKelas('');
              }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
              title="Reset Semua Filter"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-center shrink-0">
          <span className="text-[11px] font-bold text-slate-500">
            {filteredBiaya.length} Pos Tarif
          </span>
        </div>
      </div>

      {/* Table Sesuai Skema Sheet BIAYA */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1050px]">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="p-3.5 pl-4 w-36 whitespace-nowrap">Kode &amp; ID Biaya</th>
                <th className="p-3.5 min-w-[180px]">Nama Biaya</th>
                <th className="p-3.5 w-28 whitespace-nowrap">Kategori</th>
                <th className="p-3.5 w-32 whitespace-nowrap">Kelas</th>
                <th className="p-3.5 w-32 text-right whitespace-nowrap">Nominal</th>
                <th className="p-3.5 w-28 text-center whitespace-nowrap">Periode</th>
                <th className="p-3.5 w-24 text-center whitespace-nowrap">Kewajiban</th>
                <th className="p-3.5 w-24 text-center whitespace-nowrap">Status</th>
                <th className="p-3.5 pr-4 w-32 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredBiaya.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
                        <Layers size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-base">Belum Ada Pos Biaya</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Belum ada daftar pos tarif tagihan. Klik tombol di bawah untuk membuat tarif pos biaya baru.
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={handleOpenAdd}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>+ Tambah Pos Biaya</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBiaya.map(b => {
                  const kode = b.kodeBiaya || b.id;
                  const nama = b.namaBiaya || b.nama;
                  const kategori = b.kategori || 'Iuran';
                  const rombel = b.targetKelas || b.kelasNama || 'Semua Kelas';
                  const periode = b.periode || 'Bulanan';
                  const wajib = b.wajib || 'Wajib';
                  const isAktif = b.status === 'AKTIF' || b.aktif !== false;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4 font-mono">
                        <div className="font-black text-slate-800">{kode}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.biayaId || b.id}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 text-sm">{nama}</div>
                        {b.namaSiswa && b.namaSiswa !== 'Semua Siswa' && (
                          <div className="text-[10px] text-indigo-600 font-bold mt-0.5 flex items-center gap-1">
                            <UserCheck size={11} />
                            <span>Khusus Siswa: {b.namaSiswa}</span>
                          </div>
                        )}
                        {b.keterangan && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{b.keterangan}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-lg font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                          {kategori}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{rombel}</div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                        {fmtRp(b.nominal)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-50 text-sky-700 border border-sky-200">
                          {periode}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          wajib === 'Wajib' 
                            ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {wajib}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          isAktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isAktif ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Edit Pos Biaya"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id || b.biayaId, b)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Pos Biaya"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input/Edit Biaya Sesuai Skema Sheet BIAYA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-emerald-50/70 via-slate-50 to-emerald-50/30 border-b border-slate-200/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      {editingItem ? 'Edit Pos Tarif Biaya' : 'Tambah Pos Tarif Biaya Baru'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Sheet BIAYA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Konfigurasi master tarif, peruntukan rombel, frekuensi, dan status penagihan
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                title="Tutup Modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body (Scrollable with custom sections) */}
            <form id="pos-biaya-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* SEKSI 1: IDENTITAS POS BIAYA */}
              <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <Tag size={15} className="text-emerald-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Identitas Pos Biaya &amp; Klasifikasi
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Kode Biaya <span className="font-mono text-emerald-600 font-normal">(KodeBiaya)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="misal: SPP-01, DSP-01, MODUL-01"
                      value={formData.kodeBiaya}
                      onChange={(e) => setFormData(prev => ({ ...prev, kodeBiaya: e.target.value.toUpperCase() }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Kategori Pos <span className="font-mono text-emerald-600 font-normal">(Kategori)</span>
                    </label>
                    <CustomDropdown
                      value={formData.kategori}
                      onChange={(val) => setFormData(prev => ({ ...prev, kategori: val }))}
                      options={KATEGORI_OPTIONS}
                      placeholder="Pilih Kategori Pos..."
                      searchable
                      buttonClassName="py-2.5 bg-white border-slate-200 shadow-2xs text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Pos Biaya <span className="font-mono text-emerald-600 font-normal">(NamaBiaya)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Iuran Bulanan SPP, Seragam Batik & Olahraga, Modul Pembelajaran..."
                    value={formData.namaBiaya}
                    onChange={(e) => setFormData(prev => ({ ...prev, namaBiaya: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* SEKSI 2: TARGET & SASARAN */}
              <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <GraduationCap size={15} className="text-emerald-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    2. Sasaran Tingkat, Jenjang &amp; Rombel
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Jenjang Pendidikan <span className="font-mono text-emerald-600 font-normal">(Jenjang)</span>
                    </label>
                    <CustomDropdown
                      value={formData.jenjang}
                      onChange={(val) => setFormData(prev => ({ ...prev, jenjang: val }))}
                      options={JENJANG_OPTIONS}
                      placeholder="Pilih Jenjang..."
                      searchable
                      buttonClassName="py-2.5 bg-white border-slate-200 shadow-2xs text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Target Rombel <span className="font-mono text-emerald-600 font-normal">(Target_Kelas)</span>
                    </label>
                    <CustomDropdown
                      value={formData.kelasId}
                      onChange={(val) => setFormData(prev => ({ ...prev, kelasId: val }))}
                      options={kelasOptions}
                      placeholder="Semua Kelas (Umum)..."
                      searchable
                      buttonClassName="py-2.5 bg-white border-slate-200 shadow-2xs text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SEKSI 3: NOMINAL TARIF & PERIODE */}
              <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <DollarSign size={15} className="text-emerald-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    3. Skema Tarif, Frekuensi &amp; Kewajiban
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nominal Tarif <span className="font-mono text-emerald-600 font-normal">(Nominal)</span>
                    </label>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      Rp {Number(formData.nominal || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={formData.nominal}
                      onChange={(e) => setFormData(prev => ({ ...prev, nominal: Number(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    />
                  </div>

                  {/* Quick Pick Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Pilihan Cepat:</span>
                    {QUICK_NOMINALS.map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, nominal: val }))}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 cursor-pointer ${
                          formData.nominal === val
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        Rp {val.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Frekuensi Penarikan <span className="font-mono text-emerald-600 font-normal">(Periode)</span>
                    </label>
                    <CustomDropdown
                      value={formData.periode}
                      onChange={(val) => setFormData(prev => ({ ...prev, periode: val }))}
                      options={PERIODE_OPTIONS}
                      placeholder="Pilih Periode..."
                      buttonClassName="py-2.5 bg-white border-slate-200 shadow-2xs text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Status Kewajiban <span className="font-mono text-emerald-600 font-normal">(Wajib)</span>
                    </label>
                    <CustomDropdown
                      value={formData.wajib}
                      onChange={(val) => setFormData(prev => ({ ...prev, wajib: val }))}
                      options={WAJIB_OPTIONS}
                      placeholder="Pilih Kewajiban..."
                      buttonClassName="py-2.5 bg-white border-slate-200 shadow-2xs text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SEKSI 4: STATUS AKTIF & KETERANGAN */}
              <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <CheckSquare size={15} className="text-emerald-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    4. Status Keaktifan &amp; Keterangan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Status Penagihan <span className="font-mono text-emerald-600 font-normal">(Status)</span>
                    </label>
                    <CustomDropdown
                      value={formData.status}
                      onChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                      options={STATUS_OPTIONS}
                      placeholder="Pilih Status..."
                      buttonClassName="py-2.5 bg-white border-slate-200 shadow-2xs text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Catatan / Keterangan <span className="font-mono text-emerald-600 font-normal">(Keterangan)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="misal: Termasuk buku cetak & fasilitas praktikum"
                      value={formData.keterangan}
                      onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer (Sticky / Fixed Bottom) */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
              <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
                *Tersinkronisasi otomatis ke Google Spreadsheet Sheet <strong>BIAYA</strong>
              </span>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="pos-biaya-form"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Save size={15} />
                  <span>{editingItem ? 'Simpan Perubahan' : 'Simpan Pos Biaya'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
