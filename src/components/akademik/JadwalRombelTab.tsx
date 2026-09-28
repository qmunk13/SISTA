import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { getActiveClasses, getAllClasses, matchClass, formatClassLabel, matchStatusActive, triggerPrint, STANDARD_CLASSES } from '../../lib/utils';
import { getMapelNamesForClass } from '../../lib/academicSubjects';
import { MASTER_SILABUS_DATA, MasterSilabusItem } from '../../data/masterSilabusData';
import { MASTER_JADWAL_ROWS, generateJadwalItemsFromMaster, MasterJadwalRow } from '../../data/masterJadwalData';
import { 
  Calendar, Plus, Filter, Trash2, Edit2, Clock, MapPin, 
  User, BookOpen, Printer, X, Save, CheckCircle2, Search,
  Sparkles, ArrowRight, Layers, Table, Sun, Moon, Users, Check
} from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

export interface JadwalItem {
  id: string;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
  jamMulai: string;
  jamSelesai: string;
  kelas: string;
  mataPelajaran: string;
  guru: string;
  ruang: string;
  semester?: 'Ganjil' | 'Genap';
  tahunAjaran?: string;
  kategoriBelajar?: 'Aktif Bekerja' | 'Tidak Bekerja' | 'Semua';
  masterNo?: number;
  daftarMapel?: string[];
  // Integrasi Materi Silabus Kurikulum Merdeka
  silabusId?: string;
  materiPokok?: string;
  kodeModul?: string;
  temaModul?: string;
  subKe?: string | number;
}

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;

const INITIAL_SAMPLE_JADWAL: JadwalItem[] = [];

export default function JadwalRombelTab() {
  const { students, teachers, settings } = useStore();
  const activeStudents = useMemo(() => {
    return students.filter(s => matchStatusActive(s?.status));
  }, [students]);

  const classesList = useMemo(() => {
    const studentClasses = getAllClasses(activeStudents);
    const combined = Array.from(new Set([...studentClasses, ...STANDARD_CLASSES]));
    return combined.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [activeStudents]);

  // Master Silabus Dataset (Loaded from DB or default Master Silabus)
  const masterSilabusList = useMemo<MasterSilabusItem[]>(() => {
    const fromDb = db.get('master_silabus');
    if (Array.isArray(fromDb) && fromDb.length > 0) {
      return fromDb;
    }
    return MASTER_SILABUS_DATA;
  }, []);

  // Semester & Academic Year
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(() => {
    return (settings.semester === 'Genap' || settings.semester === 'Semester 2') ? 'Genap' : 'Ganjil';
  });

  useEffect(() => {
    const sem = (settings.semester === 'Genap' || settings.semester === 'Semester 2') ? 'Genap' : 'Ganjil';
    setSelectedSemester(sem);
    const handleSemChange = (e: any) => {
      if (e.detail?.semesterType) {
        setSelectedSemester(e.detail.semesterType);
      }
    };
    window.addEventListener('academic-semester-changed', handleSemChange);
    return () => window.removeEventListener('academic-semester-changed', handleSemChange);
  }, [settings.semester, settings.tahunPelajaran]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedHari, setSelectedHari] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const mapelOptions = useMemo(() => {
    return getMapelNamesForClass(selectedClass || '4');
  }, [selectedClass]);

  // Persisted Jadwal List in DB - Initialized with 27 Official Sessions from Master
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>(() => {
    const saved = db.get('jadwal_rombel') || db.get('jadwal_pelajaran') || db.get('schedule') || db.get('academic_schedules');
    const isExam = (item: any) => {
      const id = String(item?.id || item?.JadwalID || '').toUpperCase();
      if (id.startsWith('JDW-STS-') || id.startsWith('SES-STS-') || id.startsWith('CBT-')) return true;
      const kat = String(item?.kategori || item?.Kategori || '').toLowerCase();
      return kat.includes('ujian') || kat.includes('cbt') || kat.includes('sts');
    };
    const validSaved = Array.isArray(saved)
      ? saved.filter((item: any) => item && !String(item.id || '').startsWith('jdw-init-') && !isExam(item))
      : [];
    if (validSaved.length > 0) {
      return validSaved;
    }
    // Inisialisasi otomatis jika belum ada: muat 27 Sesi Resmi KTCT Tambora
    const officialGenerated = generateJadwalItemsFromMaster(
      settings.tahunPelajaran || '2026/2027',
      (settings.semester === 'Genap' || settings.semester === 'Semester 2') ? 'Genap' : 'Ganjil'
    );
    db.set('jadwal_rombel', officialGenerated);
    db.set('jadwal_pelajaran', officialGenerated);
    db.set('schedule', officialGenerated);
    db.set('academic_schedules', officialGenerated);
    db.set('jadwal', officialGenerated);
    db.set('JADWAL', officialGenerated);
    return officialGenerated;
  });

  // Tampilan: Matriks Resmi (Tabel Induk 27 Sesi) vs Kalender Harian
  const [viewMode, setViewMode] = useState<'matriks' | 'kalender'>('matriks');
  const [selectedKategori, setSelectedKategori] = useState<'Semua' | 'Aktif Bekerja' | 'Tidak Bekerja'>('Semua');
  const [selectedJenjang, setSelectedJenjang] = useState<string>('Semua');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<JadwalItem>>({
    hari: 'Senin',
    jamMulai: '13:00',
    jamSelesai: '15:00',
    kelas: '4',
    mataPelajaran: 'IPA, IPS, PAI',
    guru: teachers[0]?.name || 'Tutor Pengampu Rombel',
    ruang: 'Ruang KBM Kelas 4',
    semester: 'Ganjil',
    tahunAjaran: settings.tahunPelajaran || '2026/2027',
    kategoriBelajar: 'Tidak Bekerja',
    materiPokok: '',
    kodeModul: '',
    temaModul: ''
  });

  // Silabus Catalog Modal State
  const [showSilabusCatalog, setShowSilabusCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogClassFilter, setCatalogClassFilter] = useState('');
  const [catalogMapelFilter, setCatalogMapelFilter] = useState('');

  const saveJadwalToDb = (newList: JadwalItem[]) => {
    setJadwalList(newList);
    db.set('jadwal_rombel', newList);
    db.set('jadwal_pelajaran', newList);
    db.set('schedule', newList);
    db.set('academic_schedules', newList);
    db.set('jadwal', newList);
    db.set('JADWAL', newList);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'jadwal_rombel' } }));
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'academic_schedules' } }));
  };

  const handleApplyOfficialSchedule = () => {
    const confirmMsg = 'Terapkan matriks 27 sesi jadwal pelajaran resmi KTCT Tambora (sesuai pembagian kelompok Aktif Bekerja dan Tidak Bekerja)? Jadwal aktif akan diperbarui sesuai master.';
    if (window.confirm(confirmMsg)) {
      const generated = generateJadwalItemsFromMaster(settings.tahunPelajaran || '2026/2027', selectedSemester);
      saveJadwalToDb(generated);
      alert('✓ Berhasil menerapkan 27 sesi jadwal resmi KTCT Tambora!');
    }
  };

  const handleOpenAdd = (prefill?: Partial<JadwalItem>) => {
    setEditingId(null);
    const targetKelas = prefill?.kelas || selectedClass || classesList[0] || '4';
    const targetMapels = getMapelNamesForClass(targetKelas);
    setFormData({
      hari: 'Senin',
      jamMulai: '07:30',
      jamSelesai: '09:00',
      kelas: targetKelas,
      mataPelajaran: prefill?.mataPelajaran || targetMapels[0] || 'Bahasa Indonesia',
      guru: teachers[0]?.name || 'Guru Pengampu',
      ruang: `Ruang Kelas ${targetKelas}`,
      semester: selectedSemester,
      tahunAjaran: settings.tahunPelajaran || '2026/2027',
      materiPokok: prefill?.materiPokok || '',
      kodeModul: prefill?.kodeModul || '',
      temaModul: prefill?.temaModul || '',
      ...prefill
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: JadwalItem) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus jadwal pelajaran ini?')) {
      const updated = jadwalList.filter(j => j.id !== id);
      saveJadwalToDb(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hari || !formData.mataPelajaran || !formData.kelas) {
      alert('Mohon lengkapi data jadwal.');
      return;
    }

    if (editingId) {
      const updated = jadwalList.map(j => (j.id === editingId ? { ...j, ...formData } as JadwalItem : j));
      saveJadwalToDb(updated);
    } else {
      const newItem: JadwalItem = {
        id: `jdw-${Date.now()}`,
        hari: formData.hari as any,
        jamMulai: formData.jamMulai || '07:30',
        jamSelesai: formData.jamSelesai || '09:00',
        kelas: formData.kelas || '4',
        mataPelajaran: formData.mataPelajaran || '',
        guru: formData.guru || 'Guru Pengampu',
        ruang: formData.ruang || 'Ruang Kelas',
        semester: selectedSemester,
        tahunAjaran: settings.tahunPelajaran || '2026/2027',
        materiPokok: formData.materiPokok || '',
        kodeModul: formData.kodeModul || '',
        temaModul: formData.temaModul || ''
      };
      saveJadwalToDb([...jadwalList, newItem]);
    }
    setModalOpen(false);
  };

  // Helper filter matching silabus to form kelas & semester
  const formClassNumber = useMemo(() => {
    return String(formData.kelas || '4').replace(/\D/g, '') || '4';
  }, [formData.kelas]);

  // Matching Silabus Items for Form Dropdown
  const matchingSilabusForForm = useMemo(() => {
    const targetSem = selectedSemester === 'Ganjil' ? 'SM-I' : 'SM-II';
    return masterSilabusList.filter(s => {
      const sCls = String(s.kelas || '').replace(/\D/g, '');
      const clsMatch = sCls ? sCls === formClassNumber : true;
      const semMatch = s.semester ? s.semester.toUpperCase().includes(targetSem) || s.semester.toLowerCase().includes(selectedSemester.toLowerCase()) : true;
      return clsMatch && semMatch;
    });
  }, [masterSilabusList, formClassNumber, selectedSemester]);

  // Catalog filtered items
  const filteredCatalogSilabus = useMemo(() => {
    return masterSilabusList.filter(s => {
      // Semester match
      const targetSem = selectedSemester === 'Ganjil' ? 'SM-I' : 'SM-II';
      const semMatch = !s.semester || s.semester.toUpperCase().includes(targetSem) || s.semester.toLowerCase().includes(selectedSemester.toLowerCase());
      
      // Class match
      let clsMatch = true;
      if (catalogClassFilter) {
        const cNum = String(catalogClassFilter).replace(/\D/g, '');
        const sNum = String(s.kelas || '').replace(/\D/g, '');
        clsMatch = cNum && sNum ? cNum === sNum : true;
      }

      // Mapel match
      let mapelMatch = true;
      if (catalogMapelFilter) {
        const sMapel = (s.mataPelajaran || s.mapel || '').toLowerCase();
        mapelMatch = sMapel.includes(catalogMapelFilter.toLowerCase());
      }

      // Search keyword
      let srchMatch = true;
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        const mapel = (s.mataPelajaran || s.mapel || '').toLowerCase();
        const topik = (s.topikSubTugas || s.judulSubModul || '').toLowerCase();
        const tema = (s.temaModul || s.namaModulBab || '').toLowerCase();
        const kode = (s.kodeSubTugas || '').toLowerCase();
        srchMatch = mapel.includes(q) || topik.includes(q) || tema.includes(q) || kode.includes(q);
      }

      return semMatch && clsMatch && mapelMatch && srchMatch;
    });
  }, [masterSilabusList, selectedSemester, catalogClassFilter, catalogMapelFilter, catalogSearch]);

  // Select item from silabus catalog
  const handleSelectFromCatalog = (silabus: MasterSilabusItem) => {
    setShowSilabusCatalog(false);
    handleOpenAdd({
      mataPelajaran: silabus.mataPelajaran || silabus.mapel,
      materiPokok: silabus.topikSubTugas || silabus.judulSubModul,
      kodeModul: silabus.kodeSubTugas,
      temaModul: silabus.temaModul || silabus.namaModulBab,
      kelas: silabus.kelas ? String(silabus.kelas) : selectedClass || '4',
      semester: selectedSemester
    });
  };

  // Master Schedule Filtered Rows for Matriks View
  const filteredMasterRows = useMemo(() => {
    return MASTER_JADWAL_ROWS.filter(row => {
      const matchJenjang = selectedJenjang === 'Semua' || row.jenjang === selectedJenjang;
      const matchKelas = selectedClass ? matchClass(row.kelas, selectedClass) : true;
      
      // Filter Hari pada Matriks: cek apakah sesi jatuh pada hari yang dipilih
      const targetHari = (selectedHari || 'Semua').trim().toLowerCase();
      const matchHari = targetHari === 'semua'
        ? true
        : (
            (selectedKategori === 'Tidak Bekerja' && row.tidakBekerja.tersedia && String(row.tidakBekerja.hari || '').trim().toLowerCase() === targetHari) ||
            (selectedKategori === 'Aktif Bekerja' && row.aktifBekerja.tersedia && String(row.aktifBekerja.hari || '').trim().toLowerCase() === targetHari) ||
            (selectedKategori === 'Semua' && (
              (row.tidakBekerja.tersedia && String(row.tidakBekerja.hari || '').trim().toLowerCase() === targetHari) ||
              (row.aktifBekerja.tersedia && String(row.aktifBekerja.hari || '').trim().toLowerCase() === targetHari)
            ))
          );

      const matchKat = selectedKategori === 'Semua'
        ? true
        : selectedKategori === 'Aktif Bekerja'
          ? row.aktifBekerja.tersedia
          : row.tidakBekerja.tersedia;

      const matchSrch = searchTerm 
        ? row.mataPembelajaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.kelas.includes(searchTerm) ||
          row.tidakBekerja.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.aktifBekerja.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.daftarMapel.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      return matchJenjang && matchKelas && matchHari && matchKat && matchSrch;
    });
  }, [selectedJenjang, selectedClass, selectedHari, selectedKategori, searchTerm]);

  // Filtered List for Calendar / Card View
  const filteredJadwal = useMemo(() => {
    return jadwalList.filter(item => {
      const matchSem = !item.semester || item.semester === selectedSemester;
      const matchCls = selectedClass ? matchClass(item.kelas, selectedClass) : true;
      const targetHari = (selectedHari || 'Semua').trim().toLowerCase();
      const matchDay = targetHari === 'semua' ? true : String(item.hari || '').trim().toLowerCase() === targetHari;
      const matchKat = selectedKategori === 'Semua' 
        ? true 
        : (!item.kategoriBelajar || item.kategoriBelajar === selectedKategori || item.kategoriBelajar === 'Semua');
      const matchJenjang = selectedJenjang === 'Semua'
        ? true
        : (
            (selectedJenjang === 'Paket A' && ['4', '5', '6'].includes(item.kelas)) ||
            (selectedJenjang === 'Paket B' && ['7', '8', '9'].includes(item.kelas)) ||
            (selectedJenjang === 'Paket C' && ['10', '11', '12'].includes(item.kelas))
          );
      const matchSrch = searchTerm 
        ? item.mataPelajaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.guru.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.ruang.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchSem && matchCls && matchDay && matchKat && matchJenjang && matchSrch;
    });
  }, [jadwalList, selectedSemester, selectedClass, selectedHari, selectedKategori, selectedJenjang, searchTerm]);

  return (
    <div id="printable-area" className="printable-container space-y-6 print:p-0 print:m-0 print:space-y-4 print:w-full print:bg-white text-slate-900">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
              <Calendar size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">Jadwal Pembelajaran Rombel KTCT Tambora</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                  27 Sesi Resmi
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Alokasi KBM pembagian Kelompok Aktif Bekerja (Malam) vs Kelompok Tidak Bekerja (Siang/Sore) & Tatap Muka Minggu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            <button
              onClick={handleApplyOfficialSchedule}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-200 transition active:scale-95 cursor-pointer"
              title="Muat ulang 27 Sesi Matriks Resmi"
            >
              <Check size={14} className="stroke-[3]" />
              <span>Terapkan Jadwal Resmi (27 Sesi)</span>
            </button>
            <button
              onClick={() => {
                setCatalogClassFilter(selectedClass || '4');
                setShowSilabusCatalog(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>Ambil dari Silabus</span>
            </button>
            <button
              onClick={triggerPrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak Jadwal</span>
            </button>
            <button
              onClick={() => handleOpenAdd()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition active:scale-95"
            >
              <Plus size={15} />
              <span>+ Tambah Jadwal</span>
            </button>
          </div>
        </div>

        {/* Mode Switcher & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('matriks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'matriks'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table size={14} />
              <span>Matriks 27 Sesi Resmi (Tabel Induk)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kalender')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'kalender'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar size={14} />
              <span>Sesi Mingguan (Kartu Hari)</span>
            </button>
          </div>

          {/* Quick Badges */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Paket A: 9 Sesi (Kls 4-6)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Paket B: 9 Sesi (Kls 7-9)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Paket C: 9 Sesi (Kls 10-12)
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          <CustomDropdown
            id="jadwal-select-semester"
            label="Semester Aktif"
            value={selectedSemester}
            onChange={(val) => setSelectedSemester(val as any)}
            options={[
              { value: 'Ganjil', label: 'Semester 1 (Ganjil)' },
              { value: 'Genap', label: 'Semester 2 (Genap)' }
            ]}
            placeholder="Pilih Semester..."
          />

          <CustomDropdown
            id="jadwal-select-jenjang"
            label="Filter Jenjang"
            value={selectedJenjang}
            onChange={(val) => setSelectedJenjang(val)}
            options={[
              { value: 'Semua', label: 'Semua Jenjang' },
              { value: 'Paket A', label: 'Paket A (Setara SD)' },
              { value: 'Paket B', label: 'Paket B (Setara SMP)' },
              { value: 'Paket C', label: 'Paket C (Setara SMA)' }
            ]}
            placeholder="Pilih Jenjang..."
          />

          <CustomDropdown
            id="jadwal-select-class"
            label="Filter Rombel / Kelas"
            value={selectedClass}
            onChange={(val) => setSelectedClass(val)}
            options={[
              { value: '', label: 'Semua Rombel' },
              ...classesList.map(c => ({
                value: c,
                label: formatClassLabel(c, true)
              }))
            ]}
            placeholder="Pilih Kelas..."
            searchable={classesList.length > 5}
          />

          <CustomDropdown
            id="jadwal-select-hari"
            label="Filter Hari KBM"
            value={selectedHari}
            onChange={(val) => setSelectedHari(val)}
            options={[
              { value: 'Semua', label: 'Semua Hari' },
              ...HARI_LIST.map(h => ({
                value: h,
                label: h
              }))
            ]}
            placeholder="Pilih Hari..."
          />

          <CustomDropdown
            id="jadwal-select-kategori"
            label="Kelompok Belajar"
            value={selectedKategori}
            onChange={(val) => setSelectedKategori(val as any)}
            options={[
              { value: 'Semua', label: 'Semua Kelompok' },
              { value: 'Aktif Bekerja', label: '🌙 Aktif Bekerja (Malam)' },
              { value: 'Tidak Bekerja', label: '☀️ Tidak Bekerja (Siang)' }
            ]}
            placeholder="Pilih Kelompok..."
          />

          {/* Search Mapel */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Cari Mapel / Materi / Guru:</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari mapel/guru..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: TABEL MATRIKS 27 SESI RESMI (Identik dengan Gambar Jadwal KTCT) */}
      {viewMode === 'matriks' && (
        <div className="space-y-4 no-print">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Table size={18} className="text-indigo-400" />
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Tabel Matriks Pembagian Jadwal Pembelajaran (27 Sesi Resmi)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                  Rombongan Belajar KTCT Tambora • Semester {selectedSemester} TA {settings.tahunPelajaran || '2026/2027'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold text-white border border-white/20">
                  {filteredMasterRows.length} dari 27 Sesi
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[11px] border-b border-slate-200">
                    <th className="py-3 px-3 text-center w-12 border-r border-slate-200">No</th>
                    <th className="py-3 px-3 text-center w-24 border-r border-slate-200">Jenjang</th>
                    <th className="py-3 px-3 text-center w-20 border-r border-slate-200">Kelas</th>
                    <th className="py-3 px-4 w-60 border-r border-slate-200 bg-amber-50/70 text-amber-950">
                      <div className="flex items-center gap-1.5">
                        <Sun size={14} className="text-amber-600" />
                        <span>Kelompok Tidak Bekerja</span>
                      </div>
                      <span className="text-[9.5px] font-medium text-amber-700 block">Siang / Sore & Minggu</span>
                    </th>
                    <th className="py-3 px-4 w-60 border-r border-slate-200 bg-emerald-50/70 text-emerald-950">
                      <div className="flex items-center gap-1.5">
                        <Moon size={14} className="text-emerald-700" />
                        <span>Kelompok Aktif Bekerja</span>
                      </div>
                      <span className="text-[9.5px] font-medium text-emerald-700 block">Malam & Minggu</span>
                    </th>
                    <th className="py-3 px-4">Mata Pelajaran yang Diajarkan</th>
                    <th className="py-3 px-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {filteredMasterRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                        Tidak ada sesi jadwal yang sesuai filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredMasterRows.map((row) => {
                      const jenjangBg = 
                        row.jenjang === 'Paket A' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : row.jenjang === 'Paket B'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-purple-50 text-purple-800 border-purple-200';

                      return (
                        <tr key={row.no} className="hover:bg-indigo-50/30 transition">
                          <td className="py-3 px-3 text-center font-black text-slate-700 border-r border-slate-100">
                            {row.no}
                          </td>
                          <td className="py-3 px-3 text-center border-r border-slate-100">
                            <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black border ${jenjangBg}`}>
                              {row.jenjang}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-100">
                            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-black">
                              Kelas {row.kelas}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-r border-slate-100">
                            {row.tidakBekerja.tersedia ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">
                                  <Clock size={12} className="text-amber-700" />
                                  <span>{row.tidakBekerja.label}</span>
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-slate-400 font-medium italic text-xs">
                                -
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-100">
                            {row.aktifBekerja.tersedia ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                                  <Clock size={12} className="text-emerald-700" />
                                  <span>{row.aktifBekerja.label}</span>
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-slate-400 font-medium italic text-xs">
                                -
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 text-xs">
                                {row.mataPembelajaran}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {row.daftarMapel.map((m, mIdx) => (
                                  <span key={mIdx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                handleOpenAdd({
                                  kelas: row.kelas,
                                  mataPelajaran: row.mataPembelajaran,
                                  hari: row.aktifBekerja.hari || (row.tidakBekerja.hari as any) || 'Senin',
                                  jamMulai: row.aktifBekerja.jamMulai || row.tidakBekerja.jamMulai || '19:30',
                                  jamSelesai: row.aktifBekerja.jamSelesai || row.tidakBekerja.jamSelesai || '21:30'
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition inline-flex items-center gap-1"
                              title="Jadwalkan atau Sesuaikan"
                            >
                              <Edit2 size={12} />
                              <span>Sesuaikan</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: KALENDER SESI MINGGUAN (Kartu Per Hari) */}
      {viewMode === 'kalender' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 no-print">
          {HARI_LIST.filter(h => (selectedHari || 'Semua').trim().toLowerCase() === 'semua' || (selectedHari || '').trim().toLowerCase() === h.trim().toLowerCase()).map(hari => {
            const itemsOnDay = filteredJadwal.filter(j => String(j.hari || '').trim().toLowerCase() === hari.trim().toLowerCase());
            return (
              <div key={hari} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                {/* Day Header */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <Clock size={16} className="text-indigo-400" />
                    <span>{hari}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                    {itemsOnDay.length} Sesi
                  </span>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-3 flex-1">
                  {itemsOnDay.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada jadwal pelajaran di hari {hari}.
                    </div>
                  ) : (
                    itemsOnDay.map((item) => (
                      <div 
                        key={item.id} 
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:bg-indigo-50/40 hover:border-indigo-200 transition space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black tracking-wider uppercase inline-block">
                                {formatClassLabel(item.kelas, true)}
                              </span>
                              {item.kategoriBelajar === 'Aktif Bekerja' && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[9px] flex items-center gap-1">
                                  <Moon size={10} />
                                  <span>Aktif Bekerja (Malam)</span>
                                </span>
                              )}
                              {item.kategoriBelajar === 'Tidak Bekerja' && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[9px] flex items-center gap-1">
                                  <Sun size={10} />
                                  <span>Tidak Bekerja (Siang)</span>
                                </span>
                              )}
                              {item.kategoriBelajar === 'Semua' && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[9px] flex items-center gap-1">
                                  <Users size={10} />
                                  <span>Sesi Bersama (Minggu)</span>
                                </span>
                              )}
                              {item.kodeModul && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold">
                                  {item.kodeModul}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs leading-snug">{item.mataPelajaran}</h4>
                          </div>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 no-print">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 rounded-lg hover:bg-amber-100 text-amber-700 transition"
                              title="Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 rounded-lg hover:bg-rose-100 text-rose-700 transition"
                              title="Hapus"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Materi Pokok Silabus */}
                        {item.materiPokok ? (
                          <div className="p-2 rounded-xl bg-white border border-slate-200/80 text-[11px] space-y-1">
                            <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-emerald-700">
                              <BookOpen size={11} />
                              <span>Materi Silabus:</span>
                            </div>
                            <p className="text-slate-700 font-medium line-clamp-2 leading-relaxed">
                              {item.materiPokok}
                            </p>
                            {item.temaModul && (
                              <p className="text-[10px] text-slate-500 font-medium italic">
                                {item.temaModul}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">
                            Materi silabus belum ditautkan
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                          <div className="flex items-center gap-1 font-mono text-slate-700">
                            <Clock size={11} className="text-indigo-600 flex-shrink-0" />
                            <span>{item.jamMulai} - {item.jamSelesai}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate text-slate-700">
                            <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{item.ruang}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                          <User size={11} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{item.guru}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print-Optimized Layout (Only visible during print) */}
      <div className="hidden print:block printable-container space-y-4">
        <div className="border-b-2 border-black pb-2 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wider">KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH</h2>
          <h1 className="text-base font-black uppercase">{settings.schoolName || 'SISTEM INFORMASI AKADEMIK & KURIKULUM'}</h1>
          <p className="text-[9pt] text-gray-700">{settings.schoolAddress || '-'}</p>
          <div className="border-t border-black mt-2 pt-1">
            <h3 className="text-xs font-black uppercase underline">
              JADWAL PELAJARAN ROMBONGAN BELAJAR (ROMBEL)
            </h3>
            <p className="text-[8pt] text-gray-600">
              SEMESTER {(selectedSemester || 'Ganjil').toUpperCase()} • TAHUN AJARAN {settings.tahunPelajaran || '2026/2027'} {selectedClass ? `• KELAS: ${formatClassLabel(selectedClass, true)}` : '• SEMUA ROMBEL'}
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse border border-black print-table text-[8pt]">
          <thead>
            <tr className="bg-slate-200 text-black uppercase font-bold text-center">
              <th className="border border-black p-1 w-7">No</th>
              <th className="border border-black p-1 w-14">Hari</th>
              <th className="border border-black p-1 w-20">Waktu</th>
              <th className="border border-black p-1 w-12">Kelas</th>
              <th className="border border-black p-1 w-24">Kelompok</th>
              <th className="border border-black p-1 w-28">Mata Pelajaran</th>
              <th className="border border-black p-1">Materi Silabus / Pokok Bahasan</th>
              <th className="border border-black p-1 w-32">Guru Pengampu</th>
              <th className="border border-black p-1 w-20">Ruangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredJadwal.length === 0 ? (
              <tr>
                <td colSpan={9} className="border border-black p-4 text-center italic text-gray-500">
                  Tidak ada jadwal pelajaran pada filter terpilih.
                </td>
              </tr>
            ) : (
              filteredJadwal.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 text-center font-bold">{item.hari}</td>
                  <td className="border border-black p-1 text-center font-mono text-[7.5pt]">{item.jamMulai} - {item.jamSelesai}</td>
                  <td className="border border-black p-1 text-center font-bold">{formatClassLabel(item.kelas, true)}</td>
                  <td className="border border-black p-1 text-center text-[7pt] font-semibold">
                    {item.kategoriBelajar === 'Aktif Bekerja' ? 'Aktif Bekerja (Malam)' : item.kategoriBelajar === 'Tidak Bekerja' ? 'Tidak Bekerja (Siang)' : 'Bersama (Minggu)'}
                  </td>
                  <td className="border border-black p-1 font-semibold">{item.mataPelajaran}</td>
                  <td className="border border-black p-1">
                    <div className="font-medium text-slate-900">{item.materiPokok || '-'}</div>
                    {item.kodeModul && <div className="text-[7pt] text-gray-600 font-mono">[{item.kodeModul}]</div>}
                  </td>
                  <td className="border border-black p-1">{item.guru}</td>
                  <td className="border border-black p-1 text-center">{item.ruang}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex justify-between items-center pt-4 text-xs">
          <div>
            <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            <p className="mt-10 font-bold">Waka Kurikulum / Tim Akademik</p>
            <p>................................................</p>
          </div>
          <div className="text-right">
            <p>Mengetahui,</p>
            <p className="mt-10 font-bold">{settings.headmasterName || 'Kepala Sekolah'}</p>
            <p>NIP. {settings.headmasterNip || '-'}</p>
          </div>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {editingId ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tautkan jadwal dengan materi silabus Kurikulum Merdeka
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Syllabus Helper Picker Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Sparkles size={14} className="text-emerald-600" />
                  <span>Pilih Cepat Materi dari Silabus:</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogClassFilter(formData.kelas || '4');
                    setShowSilabusCatalog(true);
                  }}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>Buka Katalog Lengkap</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const found = masterSilabusList.find(s => s.id === val || s.kodeSubTugas === val);
                  if (found) {
                    setFormData(prev => ({
                      ...prev,
                      mataPelajaran: found.mataPelajaran || found.mapel || prev.mataPelajaran,
                      materiPokok: found.topikSubTugas || found.judulSubModul || '',
                      kodeModul: found.kodeSubTugas || '',
                      temaModul: found.temaModul || found.namaModulBab || ''
                    }));
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-950 focus:outline-none"
              >
                <option value="">-- Pilih Topik/Materi dari Silabus Kelas {formClassNumber} --</option>
                {matchingSilabusForForm.map((s, idx) => (
                  <option key={s.id || idx} value={s.id || s.kodeSubTugas}>
                    [{s.mataPelajaran || s.mapel}] {s.topikSubTugas || s.judulSubModul} ({s.kodeSubTugas})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Hari KBM</label>
                  <select
                    value={formData.hari}
                    onChange={(e) => setFormData({ ...formData, hari: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    {HARI_LIST.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Rombel / Kelas</label>
                  <select
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    {classesList.map(c => <option key={c} value={c}>{formatClassLabel(c, true)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Kelompok Belajar</label>
                  <select
                    value={formData.kategoriBelajar || 'Semua'}
                    onChange={(e) => setFormData({ ...formData, kategoriBelajar: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="Semua">Sesi Bersama (Minggu)</option>
                    <option value="Aktif Bekerja">🌙 Aktif Bekerja (Malam)</option>
                    <option value="Tidak Bekerja">☀️ Tidak Bekerja (Siang/Sore)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formData.jamMulai}
                    onChange={(e) => setFormData({ ...formData, jamMulai: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formData.jamSelesai}
                    onChange={(e) => setFormData({ ...formData, jamSelesai: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  list="mapel-options"
                  placeholder="Pilih atau ketik mata pelajaran..."
                  value={formData.mataPelajaran}
                  onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  required
                />
                <datalist id="mapel-options">
                  {mapelOptions.map((m, idx) => <option key={idx} value={m} />)}
                </datalist>
              </div>

              {/* Materi Silabus Pokok */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Materi Pokok / Sub Topik Silabus</span>
                    {formData.kodeModul && (
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">
                        Kode: {formData.kodeModul}
                      </span>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Mengkaji QS Al-Hujurat tentang keberagaman..."
                    value={formData.materiPokok || ''}
                    onChange={(e) => setFormData({ ...formData, materiPokok: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1 text-[11px]">Tema / Modul / Bab</label>
                  <input
                    type="text"
                    placeholder="Contoh: BAB 1 - Mengkaji Al-Qur'an dan Hadis"
                    value={formData.temaModul || ''}
                    onChange={(e) => setFormData({ ...formData, temaModul: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Guru Pengampu</label>
                  <input
                    type="text"
                    list="guru-options"
                    placeholder="Nama Guru..."
                    value={formData.guru}
                    onChange={(e) => setFormData({ ...formData, guru: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                  <datalist id="guru-options">
                    {teachers.map((t, idx) => <option key={t.id ? `jdwl-t-${t.id}-${idx}` : `jdwl-t-${idx}`} value={t.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Ruangan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Ruang Kelas 4A"
                    value={formData.ruang}
                    onChange={(e) => setFormData({ ...formData, ruang: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-indigo-200"
                >
                  <Save size={14} />
                  <span>Simpan Jadwal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Silabus Full Catalog Modal */}
      {showSilabusCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Katalog Master Silabus & Modul Ajar
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Pilih materi pembelajaran dari database Silabus Kurikulum Merdeka untuk dijadikan Jadwal Pelajaran.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowSilabusCatalog(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Catalog Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Filter Kelas:</label>
                <select
                  value={catalogClassFilter}
                  onChange={(e) => setCatalogClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="">Semua Kelas (1 - 6)</option>
                  {[1, 2, 3, 4, 5, 6].map(k => (
                    <option key={k} value={String(k)}>Kelas {k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Filter Mapel:</label>
                <input
                  type="text"
                  placeholder="Ketik nama mapel (PAI, PPKn, dll)..."
                  value={catalogMapelFilter}
                  onChange={(e) => setCatalogMapelFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Pencarian Topik/Materi:</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Kata kunci materi..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Catalog Item Count */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
              <span>Ditemukan <strong className="text-slate-800">{filteredCatalogSilabus.length}</strong> butir silabus untuk Semester {selectedSemester}</span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                Kurikulum Merdeka Mandiri Berbagi
              </span>
            </div>

            {/* Items Grid List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredCatalogSilabus.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Tidak ada data silabus yang sesuai filter.
                </div>
              ) : (
                filteredCatalogSilabus.map((silabus, idx) => (
                  <div
                    key={silabus.id || idx}
                    className="p-3.5 bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Kelas {silabus.kelas || '4'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          {silabus.mataPelajaran || silabus.mapel}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px]">
                          {silabus.kodeSubTugas}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                        {silabus.topikSubTugas || silabus.judulSubModul}
                      </h4>
                      {(silabus.temaModul || silabus.namaModulBab) && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          {silabus.temaModul || silabus.namaModulBab}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectFromCatalog(silabus)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-200 transition shrink-0 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Buat Jadwal</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSilabusCatalog(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Tutup Katalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
