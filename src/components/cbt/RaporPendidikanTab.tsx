import React, { useState, useMemo, useEffect } from 'react';
import { 
  Award, TrendingUp, ShieldCheck, BookOpen, 
  Users, CheckCircle2, AlertTriangle, ArrowUpRight, 
  Printer, Download, Sparkles, School, Layers, Check,
  Plus, Edit3, Trash2, X, Save, RefreshCw, FileText, ArrowRight,
  CloudDownload, UploadCloud, Loader2
} from 'lucide-react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { pullSpecificSheetFromGas } from '../../utils/gasSync';
import { autoSyncEngine } from '../../data/autoSyncEngine';
import Swal from 'sweetalert2';

export interface IndikatorSub {
  nama: string;
  skor: number;
  status: string;
}

export interface DimensiRapor {
  id: string;
  tahun: string;
  kode: string;
  nama: string;
  skor: number;
  delta: number;
  kategori: string;
  color: string;
  deskripsi: string;
  nasionalAvg: number;
  kabupatenAvg: number;
  indikatorList: IndikatorSub[];
  rekomendasiBenahi: string;
}

const TEMPLATE_DIMENSI_STANDAR: Omit<DimensiRapor, 'id' | 'tahun'>[] = [
  {
    kode: 'A.1',
    nama: 'Kemampuan Literasi (AKM)',
    skor: 0,
    delta: 0,
    kategori: 'Perlu Pengisian',
    color: 'emerald',
    deskripsi: 'Kompetensi literasi membaca teks informasi dan sastra fiksi peserta didik.',
    nasionalAvg: 68.0,
    kabupatenAvg: 70.0,
    indikatorList: [
      { nama: 'Kompetensi membaca teks informasi', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Kompetensi membaca teks sastra/fiksi', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Kompetensi mengakses dan menemukan isi teks', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Kompetensi mengevaluasi dan merefleksi teks', skor: 0, status: 'Belum Dinilai' }
    ],
    rekomendasiBenahi: 'Penguatan Gerakan Literasi Sekolah (GLS) dan penyediaan ragam bacaan berjenjang.'
  },
  {
    kode: 'A.2',
    nama: 'Kemampuan Numerasi (AKM)',
    skor: 0,
    delta: 0,
    kategori: 'Perlu Pengisian',
    color: 'cyan',
    deskripsi: 'Kemampuan menerapkan konsep matematika dalam situasi nyata dan pemecahan masalah konteks sehari-hari.',
    nasionalAvg: 62.0,
    kabupatenAvg: 65.0,
    indikatorList: [
      { nama: 'Domain Bilangan dan Aljabar', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Domain Geometri dan Pengukuran', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Domain Data dan Ketidakpastian', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Penalaran Matematika Tingkat Tinggi', skor: 0, status: 'Belum Dinilai' }
    ],
    rekomendasiBenahi: 'Penerapan model pembelajaran numerasi kontekstual dengan media peraga konkret.'
  },
  {
    kode: 'A.3',
    nama: 'Karakter Peserta Didik (Survei Karakter)',
    skor: 0,
    delta: 0,
    kategori: 'Perlu Pengisian',
    color: 'indigo',
    deskripsi: 'Pembiasaan nilai-nilai Profil Pelajar Pancasila dalam perilaku sehari-hari.',
    nasionalAvg: 74.0,
    kabupatenAvg: 76.0,
    indikatorList: [
      { nama: 'Beriman, Bertakwa, & Berakhlak Mulia', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Gotong Royong & Kepedulian Sosial', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Kreativitas & Kemandirian', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Nalar Kritis & Refleksi Diri', skor: 0, status: 'Belum Dinilai' }
    ],
    rekomendasiBenahi: 'Integrasi Projek Penguatan Profil Pelajar Pancasila (P5) berbasis kearifan lokal.'
  },
  {
    kode: 'D.1',
    nama: 'Kualitas Pembelajaran (Sulinjar)',
    skor: 0,
    delta: 0,
    kategori: 'Perlu Pengisian',
    color: 'purple',
    deskripsi: 'Efektivitas perencanaan, proses instruksional di kelas, dan umpan balik belajar.',
    nasionalAvg: 71.0,
    kabupatenAvg: 73.0,
    indikatorList: [
      { nama: 'Manajemen Kelas yang Kondusif', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Dukungan Afektif & Perhatian Guru', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Aktivasi Kognitif dalam KBM', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Pembelajaran Terdiferensiasi', skor: 0, status: 'Belum Dinilai' }
    ],
    rekomendasiBenahi: 'Optimalisasi Komunitas Belajar (Kombel) Guru untuk modul ajar berdiferensiasi.'
  },
  {
    kode: 'D.4',
    nama: 'Iklim Keamanan Sekolah (Sulinjar)',
    skor: 0,
    delta: 0,
    kategori: 'Perlu Pengisian',
    color: 'emerald',
    deskripsi: 'Kondisi lingkungan sekolah yang aman dari perundungan, kekerasan, dan diskriminasi.',
    nasionalAvg: 76.0,
    kabupatenAvg: 78.0,
    indikatorList: [
      { nama: 'Bebas Perundungan (Anti-Bullying)', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Bebas Hukuman Fisik', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Bebas Kekerasan Seksual', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Pencegahan Narkoba & Miras', skor: 0, status: 'Belum Dinilai' }
    ],
    rekomendasiBenahi: 'Penguatan Tim Pencegahan & Penanganan Kekerasan (TPPK) satuan pendidikan.'
  },
  {
    kode: 'D.8',
    nama: 'Iklim Kebinekaan & Inklusivitas (Sulinjar)',
    skor: 0,
    delta: 0,
    kategori: 'Perlu Pengisian',
    color: 'amber',
    deskripsi: 'Penerimaan terhadap perbedaan budaya, agama, latar belakang, dan peserta didik berkebutuhan khusus.',
    nasionalAvg: 75.0,
    kabupatenAvg: 77.0,
    indikatorList: [
      { nama: 'Toleransi Agama dan Budaya', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Kesetaraan Gender', skor: 0, status: 'Belum Dinilai' },
      { nama: 'Sikap Inklusif bagi Siswa Khusus', skor: 0, status: 'Belum Dinilai' }
    ],
    rekomendasiBenahi: 'Penyelenggaraan kegiatan apresiasi keberagaman dan layanan pendidikan inklusif.'
  }
];

export default function RaporPendidikanTab() {
  const { settings } = useStore();
  const [selectedTahun, setSelectedTahun] = useState('2026/2027');
  
  // Real DB state (No dummy data)
  const [dimensiList, setDimensiList] = useState<DimensiRapor[]>(() => {
    const saved = db.get('rapor_pendidikan_list');
    return Array.isArray(saved) ? saved : [];
  });

  const [isPullingRapor, setIsPullingRapor] = useState(false);
  const [isPushingRapor, setIsPushingRapor] = useState(false);

  // Reactive DB update listener
  useEffect(() => {
    const handleDbUpdate = (e: any) => {
      if (!e?.detail?.key || e.detail.key === 'rapor_pendidikan_list' || e.detail.key === 'RAPOR_PENDIDIKAN') {
        const saved = db.get('rapor_pendidikan_list');
        if (Array.isArray(saved)) {
          setDimensiList(saved);
        }
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, []);

  const [activeDimensiId, setActiveDimensiId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDimensi, setEditingDimensi] = useState<DimensiRapor | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    kode: 'A.1',
    nama: '',
    skor: 0,
    delta: 0,
    kategori: 'Cakap',
    color: 'emerald',
    deskripsi: '',
    nasionalAvg: 68.0,
    kabupatenAvg: 70.0,
    rekomendasiBenahi: '',
    indikatorList: [
      { nama: 'Indikator Utama 1', skor: 0, status: 'Cakap' },
      { nama: 'Indikator Utama 2', skor: 0, status: 'Cakap' }
    ] as IndikatorSub[]
  });

  const saveDimensiToDb = (newList: DimensiRapor[]) => {
    setDimensiList(newList);
    db.set('rapor_pendidikan_list', newList);
  };

  // Filter by selected year
  const filteredDimensi = useMemo(() => {
    return dimensiList.filter(d => d.tahun === selectedTahun);
  }, [dimensiList, selectedTahun]);

  // Selected item
  const selectedDimensi = useMemo(() => {
    if (activeDimensiId) {
      const found = filteredDimensi.find(d => d.id === activeDimensiId);
      if (found) return found;
    }
    return filteredDimensi[0] || null;
  }, [filteredDimensi, activeDimensiId]);

  // Load Kemdikbud standard structure
  const handleLoadStandardTemplate = () => {
    const newItems: DimensiRapor[] = TEMPLATE_DIMENSI_STANDAR.map((item, idx) => ({
      ...item,
      id: `dim-${Date.now()}-${idx}`,
      tahun: selectedTahun
    }));

    const nonCurrentYear = dimensiList.filter(d => d.tahun !== selectedTahun);
    const updated = [...nonCurrentYear, ...newItems];
    saveDimensiToDb(updated);
    if (newItems.length > 0) {
      setActiveDimensiId(newItems[0].id);
    }
  };

  const handleOpenAdd = () => {
    setEditingDimensi(null);
    setFormData({
      kode: 'A.1',
      nama: '',
      skor: 75,
      delta: 2.5,
      kategori: 'Cakap',
      color: 'emerald',
      deskripsi: '',
      nasionalAvg: 68.0,
      kabupatenAvg: 70.0,
      rekomendasiBenahi: '',
      indikatorList: [
        { nama: 'Indikator 1', skor: 75, status: 'Cakap' },
        { nama: 'Indikator 2', skor: 75, status: 'Cakap' }
      ]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: DimensiRapor) => {
    setEditingDimensi(d);
    setFormData({
      kode: d.kode,
      nama: d.nama,
      skor: d.skor,
      delta: d.delta,
      kategori: d.kategori,
      color: d.color,
      deskripsi: d.deskripsi,
      nasionalAvg: d.nasionalAvg,
      kabupatenAvg: d.kabupatenAvg,
      rekomendasiBenahi: d.rekomendasiBenahi,
      indikatorList: d.indikatorList && d.indikatorList.length > 0 
        ? [...d.indikatorList]
        : [{ nama: 'Indikator Utama', skor: d.skor, status: d.kategori }]
    });
    setIsModalOpen(true);
  };

  const handleDeleteDimensi = (id: string) => {
    if (window.confirm('Hapus data dimensi mutu ini?')) {
      const updated = dimensiList.filter(d => d.id !== id);
      saveDimensiToDb(updated);
      if (activeDimensiId === id) {
        const next = updated.find(d => d.tahun === selectedTahun);
        setActiveDimensiId(next ? next.id : '');
      }
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      alert('Nama dimensi harus diisi');
      return;
    }

    if (editingDimensi) {
      const updated = dimensiList.map(d => {
        if (d.id === editingDimensi.id) {
          return {
            ...d,
            ...formData,
            tahun: selectedTahun
          };
        }
        return d;
      });
      saveDimensiToDb(updated);
    } else {
      const newItem: DimensiRapor = {
        id: `dim-${Date.now()}`,
        tahun: selectedTahun,
        ...formData
      };
      saveDimensiToDb([...dimensiList, newItem]);
      setActiveDimensiId(newItem.id);
    }

    setIsModalOpen(false);
  };

  const handleIndikatorChange = (idx: number, field: keyof IndikatorSub, value: any) => {
    const next = [...formData.indikatorList];
    next[idx] = { ...next[idx], [field]: value };
    setFormData(prev => ({ ...prev, indikatorList: next }));
  };

  const handleAddIndikatorRow = () => {
    setFormData(prev => ({
      ...prev,
      indikatorList: [...prev.indikatorList, { nama: '', skor: 70, status: 'Cakap' }]
    }));
  };

  const handleRemoveIndikatorRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      indikatorList: prev.indikatorList.filter((_, i) => i !== idx)
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Tarik Data Rapor Pendidikan Langsung dari Sheet RAPOR_PENDIDIKAN
  const handlePullRaporFromSheets = async () => {
    setIsPullingRapor(true);
    try {
      const res = await pullSpecificSheetFromGas('RAPOR_PENDIDIKAN');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mappedList: DimensiRapor[] = res.data.map((r: any, idx: number) => {
          let indList: IndikatorSub[] = [];
          if (r.IndikatorListJSON || r.indikatorList) {
            try {
              indList = typeof r.IndikatorListJSON === 'string' ? JSON.parse(r.IndikatorListJSON) : (r.IndikatorListJSON || r.indikatorList);
            } catch {
              indList = [];
            }
          }
          return {
            id: String(r.DimensiID || r.id || `dim-gas-${idx + 1}`),
            tahun: String(r.Tahun || r.tahun || selectedTahun),
            kode: String(r.Kode || r.kode || `A.${idx + 1}`),
            nama: String(r.Nama || r.nama || `Dimensi ${idx + 1}`),
            skor: Number(r.Skor || r.skor || 0),
            delta: Number(r.Delta || r.delta || 0),
            kategori: String(r.Kategori || r.kategori || 'Cakap'),
            color: String(r.Warna || r.color || 'emerald'),
            deskripsi: String(r.Deskripsi || r.deskripsi || ''),
            nasionalAvg: Number(r.RataRataNasional || r.nasionalAvg || 68),
            kabupatenAvg: Number(r.RataRataKabupaten || r.kabupatenAvg || 70),
            indikatorList: Array.isArray(indList) && indList.length > 0 ? indList : [
              { nama: 'Indikator Utama', skor: Number(r.Skor || r.skor || 70), status: String(r.Kategori || r.kategori || 'Cakap') }
            ],
            rekomendasiBenahi: String(r.RekomendasiBenahi || r.rekomendasiBenahi || '')
          };
        });

        saveDimensiToDb(mappedList);
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'rapor_pendidikan_list' } }));

        await Swal.fire({
          title: 'Berhasil Ditarik!',
          text: `Berhasil menarik ${mappedList.length} data Rapor Pendidikan dari Sheet RAPOR_PENDIDIKAN.`,
          icon: 'success',
          confirmButtonColor: '#7c3aed'
        });
      } else {
        await Swal.fire({
          title: 'Sheet Kosong',
          text: 'Sheet RAPOR_PENDIDIKAN di Google Spreadsheet belum memiliki data.',
          icon: 'info',
          confirmButtonColor: '#7c3aed'
        });
      }
    } catch (err: any) {
      console.error('Error pulling RAPOR_PENDIDIKAN:', err);
      Swal.fire({
        title: 'Gagal Menarik Data',
        text: err?.message || 'Gagal menghubungi Google Apps Script.',
        icon: 'error',
        confirmButtonColor: '#7c3aed'
      });
    } finally {
      setIsPullingRapor(false);
    }
  };

  // Simpan Data Rapor Pendidikan ke Sheet RAPOR_PENDIDIKAN
  const handlePushRaporToSheets = async () => {
    if (dimensiList.length === 0) {
      Swal.fire({
        title: 'Data Masih Kosong',
        text: 'Silakan input atau muat data dimensi mutu terlebih dahulu sebelum menyimpan ke Spreadsheet.',
        icon: 'warning',
        confirmButtonColor: '#7c3aed'
      });
      return;
    }
    setIsPushingRapor(true);
    try {
      db.set('rapor_pendidikan_list', dimensiList);
      const pushRes = await autoSyncEngine.pushSpecificTables(['RAPOR_PENDIDIKAN']);
      if (pushRes.success) {
        await Swal.fire({
          title: 'Berhasil Disimpan!',
          text: `Data Rapor Pendidikan (${dimensiList.length} dimensi mutu) berhasil dikirim dan tersimpan di Sheet RAPOR_PENDIDIKAN.`,
          icon: 'success',
          confirmButtonColor: '#7c3aed'
        });
      } else {
        await Swal.fire({
          title: 'Sinkronisasi Berhasil',
          text: 'Data Rapor Pendidikan tersimpan di database lokal dan terantre untuk push.',
          icon: 'info',
          confirmButtonColor: '#7c3aed'
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: err?.message || 'Terjadi kesalahan saat menyimpan ke Spreadsheet.',
        icon: 'error',
        confirmButtonColor: '#7c3aed'
      });
    } finally {
      setIsPushingRapor(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award size={18} />
            </div>
            <h2 className="text-lg font-black text-slate-900">Rapor Pendidikan & Mutu Asesmen Nasional</h2>
          </div>
          <p className="text-xs text-slate-500">
            Hasil evaluasi standar mutu berbasis data (PBD) dari Asesmen Nasional (ANBK), Survei Karakter, dan Survei Lingkungan Belajar (Sulinjar).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedTahun}
            onChange={(e) => {
              setSelectedTahun(e.target.value);
              setActiveDimensiId('');
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="2026/2027">Tahun 2026/2027 (Terkini)</option>
            <option value="2025/2026">Tahun 2025/2026</option>
            <option value="2024/2025">Tahun 2024/2025</option>
          </select>

          <button
            onClick={handlePullRaporFromSheets}
            disabled={isPullingRapor}
            className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-2xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Tarik data Rapor Pendidikan dari Sheet RAPOR_PENDIDIKAN"
          >
            <CloudDownload size={15} className={isPullingRapor ? 'animate-bounce' : ''} />
            <span>{isPullingRapor ? 'Menarik...' : 'Tarik dari Sheet'}</span>
          </button>

          <button
            onClick={handlePushRaporToSheets}
            disabled={isPushingRapor || dimensiList.length === 0}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Simpan data Rapor Pendidikan ke Sheet RAPOR_PENDIDIKAN"
          >
            <UploadCloud size={15} className={isPushingRapor ? 'animate-pulse' : ''} />
            <span>{isPushingRapor ? 'Menyimpan...' : 'Simpan ke Sheet'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={15} />
            <span>Input Dimensi Mutu</span>
          </button>

          {filteredDimensi.length > 0 && (
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95"
            >
              <Printer size={15} />
              <span>Cetak Rapor Mutu</span>
            </button>
          )}
        </div>
      </div>

      {/* When Empty */}
      {filteredDimensi.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Award size={32} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-black text-slate-900">Belum Ada Data Rapor Pendidikan ({selectedTahun})</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Anda dapat menginput skor capaian asesmen secara mandiri atau memuat template 6 dimensi standar ANBK Kemdikbudristek.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleLoadStandardTemplate}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-sm transition flex items-center gap-2 active:scale-95"
            >
              <RefreshCw size={15} />
              <span>Muat Struktur 6 Dimensi Standar Kemdikbud</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-2 active:scale-95"
            >
              <Plus size={15} />
              <span>Input Manual Dimensi Baru</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Grid of Key Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
            {filteredDimensi.map((d) => {
              const isSelected = selectedDimensi?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setActiveDimensiId(d.id)}
                  className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                    isSelected 
                      ? 'bg-purple-50/50 border-purple-400 shadow-md ring-2 ring-purple-400/20' 
                      : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 pr-14">
                      <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
                        Dimensi {d.kode}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1 line-clamp-1">{d.nama}</h3>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-90 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(d);
                        }}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="Edit Dimensi"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDimensi(d.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Dimensi"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-3xl font-black text-slate-900 font-mono">{d.skor}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full flex items-center gap-0.5">
                          <TrendingUp size={11} /> {d.delta >= 0 ? `+${d.delta}` : d.delta}%
                        </span>
                        <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                          {d.kategori}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600"
                        style={{ width: `${Math.min(Math.max(d.skor, 0), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Rerata Kab: <strong>{d.kabupatenAvg}</strong></span>
                    <span>Rerata Nas: <strong>{d.nasionalAvg}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Deep-Dive for Selected Dimension */}
          {selectedDimensi && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold">
                    <Sparkles size={14} /> Analisis Rinci Indikator Mutu Satuan Pendidikan
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Dimensi {selectedDimensi.kode} : {selectedDimensi.nama}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-2xl">
                    {selectedDimensi.deskripsi || 'Evaluasi capaian mutu berdasarkan hasil instrumen Asesmen Nasional.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-center min-w-[140px]">
                    <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider block">Indeks Capaian</span>
                    <div className="text-3xl font-black text-purple-900 font-mono">{selectedDimensi.skor}</div>
                    <span className="text-[11px] font-bold text-emerald-700">Kategori {selectedDimensi.kategori}</span>
                  </div>
                  
                  <button
                    onClick={() => handleOpenEdit(selectedDimensi)}
                    className="p-3 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded-2xl transition no-print"
                    title="Edit Skor & Rekomendasi"
                  >
                    <Edit3 size={18} />
                  </button>
                </div>
              </div>

              {/* Benchmark Comparison */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  Perbandingan Capaian dengan Rerata Wilayah & Nasional
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-purple-900">Satuan Pendidikan ({settings.schoolName || 'SDN Rombel Tambora'})</span>
                      <span className="font-mono text-purple-700">{selectedDimensi.skor} Poin</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${Math.min(Math.max(selectedDimensi.skor, 0), 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-600 mb-1">
                      <span>Rerata Kabupaten / Kota</span>
                      <span className="font-mono">{selectedDimensi.kabupatenAvg} Poin</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full transition-all" style={{ width: `${Math.min(Math.max(selectedDimensi.kabupatenAvg, 0), 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold text-slate-600 mb-1">
                      <span>Rerata Nasional</span>
                      <span className="font-mono">{selectedDimensi.nasionalAvg} Poin</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-300 rounded-full transition-all" style={{ width: `${Math.min(Math.max(selectedDimensi.nasionalAvg, 0), 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Indikator Sub-Komponen */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    Rincian Indikator Capaian Sub-Dimensi
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedDimensi.indikatorList && selectedDimensi.indikatorList.length > 0 ? (
                    selectedDimensi.indikatorList.map((ind, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-xs">{ind.nama}</div>
                          <div className="text-[10px] text-slate-500 font-medium">Kategori: <strong className="text-purple-700">{ind.status}</strong></div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-sm text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                            {ind.skor}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                      Belum ada rincian indikator sub-komponen.
                    </div>
                  )}
                </div>
              </div>

              {/* Rekomendasi PBD (Perencanaan Berbasis Data) */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 to-slate-900 text-white space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                  <School size={15} /> Rekomendasi Pembenahan Mutu (PBD)
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedDimensi.rekomendasiBenahi || 'Belum ada catatan rekomendasi pembenahan mutu untuk dimensi ini.'}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Input / Edit Dimensi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingDimensi ? 'Edit Dimensi Rapor Pendidikan' : 'Tambah Dimensi Mutu Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">Tahun Asesmen: {selectedTahun}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Dimensi</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: A.1, A.2, D.4"
                    value={formData.kode}
                    onChange={(e) => setFormData(prev => ({ ...prev, kode: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Dimensi Mutu</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Kemampuan Literasi (AKM)"
                    value={formData.nama}
                    onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Skor Satuan (0-100)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.skor}
                    onChange={(e) => setFormData(prev => ({ ...prev, skor: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-purple-700 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delta (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.delta}
                    onChange={(e) => setFormData(prev => ({ ...prev, delta: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData(prev => ({ ...prev, kategori: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="Mahir">Mahir</option>
                    <option value="Cakap">Cakap</option>
                    <option value="Dasar">Dasar</option>
                    <option value="Perlu Intervensi Khusus">Perlu Intervensi Khusus</option>
                    <option value="Membudaya">Membudaya</option>
                    <option value="Baik">Baik</option>
                    <option value="Terarah">Terarah</option>
                    <option value="Perlu Pengisian">Perlu Pengisian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rerata Kab / Nas</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Kab"
                      value={formData.kabupatenAvg}
                      onChange={(e) => setFormData(prev => ({ ...prev, kabupatenAvg: parseFloat(e.target.value) || 0 }))}
                      className="w-1/2 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 font-mono text-center"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Nas"
                      value={formData.nasionalAvg}
                      onChange={(e) => setFormData(prev => ({ ...prev, nasionalAvg: parseFloat(e.target.value) || 0 }))}
                      className="w-1/2 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Ringkas</label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan capaian dimensi mutu..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Sub-Indikator Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Indikator Sub-Komponen ({formData.indikatorList.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIndikatorRow}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Tambah Sub-Indikator
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.indikatorList.map((ind, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                      <input
                        type="text"
                        placeholder="Nama sub-indikator..."
                        value={ind.nama}
                        onChange={(e) => handleIndikatorChange(idx, 'nama', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Skor"
                        value={ind.skor}
                        onChange={(e) => handleIndikatorChange(idx, 'skor', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono text-center"
                      />
                      <input
                        type="text"
                        placeholder="Kategori"
                        value={ind.status}
                        onChange={(e) => handleIndikatorChange(idx, 'status', e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIndikatorRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rekomendasi Pembenahan Mutu (PBD / RKT)</label>
                <textarea
                  rows={2}
                  placeholder="Langkah tindak lanjut konkret untuk dokumen Rencana Kerja Tahunan..."
                  value={formData.rekomendasiBenahi}
                  onChange={(e) => setFormData(prev => ({ ...prev, rekomendasiBenahi: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={15} />
                  <span>Simpan Dimensi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
