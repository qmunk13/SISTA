import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { BkPrestasi } from '../../data/bkSeed';
import { useStore } from '../../store';
import { 
  Award, Search, Plus, Filter, X, Eye, Edit, Trash2, Save, Printer, 
  Sparkles, Star, Trophy, Medal, Calendar, FileText
} from 'lucide-react';

interface PrestasiTabProps {
  onRefreshAll?: () => void;
}

export default function PrestasiTab({ onRefreshAll }: PrestasiTabProps) {
  const { students } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterBidang, setFilterBidang] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<BkPrestasi | null>(null);
  const [editItem, setEditItem] = useState<BkPrestasi | null>(null);
  const [deleteItem, setDeleteItem] = useState<BkPrestasi | null>(null);

  // Form State for Add
  const [formData, setFormData] = useState<Partial<BkPrestasi>>({
    tanggal: new Date().toISOString().split('T')[0],
    siswaId: '',
    namaSiswa: '',
    nis: '',
    kelas: '',
    namaEvent: '',
    bidang: 'Akademik / Sains',
    tingkat: 'Kota / Kab',
    capaian: 'Juara 1 (Emas)',
    poinReward: 50,
    penyelenggara: 'Dinas Pendidikan / Kemenag',
    noSertifikat: '',
    pembimbing: '',
  });

  const prestasiList = useMemo(() => {
    return db.get<BkPrestasi>('bk_prestasi') || [];
  }, []);

  const [dataList, setDataList] = useState<BkPrestasi[]>(prestasiList);

  const saveToDb = (newList: BkPrestasi[]) => {
    setDataList(newList);
    db.set('bk_prestasi', newList);
    // update bimbingan legacy list
    const legacy = (db.get('bimbingan') as any[]) || [];
    const others = legacy.filter((b: any) => b.jenis !== 'Prestasi');
    const newLegacy = [
      ...others,
      ...newList.map(pr => ({
        id: pr.id,
        nama: pr.namaSiswa,
        kelas: pr.kelas,
        jenis: 'Prestasi',
        judul: `${pr.capaian} - ${pr.namaEvent}`,
        tgl: pr.tanggal,
        poin: `+${pr.poinReward}`,
        status: 'TERVERIFIKASI',
        keterangan: `Tingkat ${pr.tingkat}, Penyelenggara: ${pr.penyelenggara}`
      }))
    ];
    db.set('bimbingan', newLegacy);
    if (onRefreshAll) onRefreshAll();
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return dataList.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        item.namaSiswa.toLowerCase().includes(q) || 
        item.id.toLowerCase().includes(q) || 
        item.namaEvent.toLowerCase().includes(q) ||
        item.nis.toLowerCase().includes(q);
      const matchKelas = !filterKelas || item.kelas === filterKelas;
      const matchBidang = !filterBidang || item.bidang === filterBidang;
      const matchTingkat = !filterTingkat || item.tingkat === filterTingkat;
      return matchSearch && matchKelas && matchBidang && matchTingkat;
    });
  }, [dataList, searchTerm, filterKelas, filterBidang, filterTingkat]);

  // Unique Classes for Filter
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    dataList.forEach(k => { if (k.kelas) set.add(k.kelas); });
    students.forEach(s => { if (s.class) set.add(s.class); });
    return Array.from(set).sort();
  }, [dataList, students]);

  // Handle Student Selection in Add Form
  const handleStudentSelect = (studentId: string) => {
    const selected = students.find(s => s.id === studentId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        siswaId: selected.id,
        namaSiswa: selected.name,
        nis: selected.nisn || selected.nis || '-',
        kelas: selected.class || 'Kelas 4A'
      }));
    }
  };

  // Auto calculate reward point based on level & achievement
  const calculateDefaultReward = (tingkat: string, capaian: string) => {
    let base = 20;
    if (tingkat === 'Internasional') base = 100;
    else if (tingkat === 'Nasional') base = 75;
    else if (tingkat === 'Provinsi') base = 50;
    else if (tingkat === 'Kota / Kab') base = 35;
    else if (tingkat === 'Kecamatan') base = 25;

    if (capaian.includes('Juara 1') || capaian.includes('Emas')) return base + 15;
    if (capaian.includes('Juara 2') || capaian.includes('Perak')) return base + 10;
    if (capaian.includes('Juara 3') || capaian.includes('Perunggu')) return base + 5;
    return base;
  };

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaSiswa || !formData.namaEvent) {
      alert('Nama siswa dan nama kejuaraan wajib diisi.');
      return;
    }
    const newId = `PRS-${new Date().getFullYear()}-${String(dataList.length + 1).padStart(3, '0')}`;
    const calculatedReward = calculateDefaultReward(formData.tingkat || 'Kota / Kab', formData.capaian || 'Juara 1 (Emas)');
    const newItem: BkPrestasi = {
      id: newId,
      tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
      siswaId: formData.siswaId || String(Date.now()),
      namaSiswa: formData.namaSiswa || '',
      nis: formData.nis || '-',
      kelas: formData.kelas || 'Kelas 4A',
      namaEvent: formData.namaEvent || '',
      bidang: formData.bidang || 'Akademik / Sains',
      tingkat: formData.tingkat || 'Kota / Kab',
      capaian: formData.capaian || 'Juara 1 (Emas)',
      poinReward: Number(formData.poinReward) || calculatedReward,
      penyelenggara: formData.penyelenggara || 'Dinas Pendidikan',
      noSertifikat: formData.noSertifikat || `SERTIF/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      pembimbing: formData.pembimbing || '',
      createdAt: new Date().toISOString(),
    };
    saveToDb([newItem, ...dataList]);
    setIsAddModalOpen(false);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      siswaId: '',
      namaSiswa: '',
      nis: '',
      kelas: '',
      namaEvent: '',
      bidang: 'Akademik / Sains',
      tingkat: 'Kota / Kab',
      capaian: 'Juara 1 (Emas)',
      poinReward: 50,
      penyelenggara: 'Dinas Pendidikan / Kemenag',
      noSertifikat: '',
      pembimbing: '',
    });
  };

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    saveToDb(dataList.map(item => item.id === editItem.id ? editItem : item));
    setEditItem(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteItem) return;
    saveToDb(dataList.filter(item => item.id !== deleteItem.id));
    setDeleteItem(null);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 animate-in fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Award className="text-emerald-600" size={20} />
            Buku Prestasi & Kejuaraan Siswa
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Dokumentasi kejuaraan lomba akademik, olahraga, seni, tahfidz, dan perolehan reward karakter
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
        >
          <Plus size={15} />
          <span>Input Prestasi Siswa</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari siswa, NIS, nama kejuaraan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Semua Rombel / Kelas</option>
            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filterBidang}
            onChange={(e) => setFilterBidang(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Semua Bidang Prestasi</option>
            <option value="Akademik / Sains">Akademik / Sains</option>
            <option value="Olahraga">Olahraga</option>
            <option value="Seni & Budaya">Seni & Budaya</option>
            <option value="Keagamaan & Tahfidz">Keagamaan & Tahfidz</option>
            <option value="Riset & Teknologi">Riset & Teknologi</option>
          </select>

          <select
            value={filterTingkat}
            onChange={(e) => setFilterTingkat(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Semua Tingkat</option>
            <option value="Sekolah">Sekolah</option>
            <option value="Kecamatan">Kecamatan</option>
            <option value="Kota / Kab">Kota / Kabupaten</option>
            <option value="Provinsi">Provinsi</option>
            <option value="Nasional">Nasional</option>
            <option value="Internasional">Internasional</option>
          </select>
        </div>

        <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 whitespace-nowrap">
          Menampilkan {filteredList.length} Prestasi
        </span>
      </div>

      {/* Specific Prestasi Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
            <tr>
              <th className="p-3.5 pl-4">No Prestasi</th>
              <th className="p-3.5">Tanggal</th>
              <th className="p-3.5">Nama Siswa & NIS</th>
              <th className="p-3.5">Rombel</th>
              <th className="p-3.5">Nama Event / Kejuaraan</th>
              <th className="p-3.5">Bidang</th>
              <th className="p-3.5 text-center">Tingkat</th>
              <th className="p-3.5 text-center">Capaian Juara</th>
              <th className="p-3.5 text-center">Reward (+)</th>
              <th className="p-3.5">Penyelenggara & Piagam</th>
              <th className="p-3.5 pr-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-10 text-center text-slate-400">
                  <Award size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600 text-sm">Belum Ada Data Prestasi</p>
                  <p className="text-xs text-slate-400 mt-0.5">Input prestasi kejuaraan siswa untuk menambah poin apresiasi.</p>
                </td>
              </tr>
            ) : (
              filteredList.map((pr) => (
                <tr key={pr.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 pl-4 font-mono font-bold text-emerald-700">{pr.id}</td>
                  <td className="p-3.5 font-mono text-slate-900 font-semibold">{pr.tanggal}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 text-sm">{pr.namaSiswa}</div>
                    <div className="text-[10px] text-slate-400 font-mono">NIS: {pr.nis}</div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">{pr.kelas}</td>
                  <td className="p-3.5 text-slate-900 font-bold max-w-xs truncate" title={pr.namaEvent}>
                    {pr.namaEvent}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 font-bold rounded-md text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                      {pr.bidang}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 font-black uppercase rounded-md text-[9px] ${
                      pr.tingkat === 'Internasional' || pr.tingkat === 'Nasional' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      pr.tingkat === 'Provinsi' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                      'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {pr.tingkat}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-0.5 font-bold rounded-full text-[10px] bg-amber-100 text-amber-900 border border-amber-200">
                      {pr.capaian}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      +{pr.poinReward}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600 text-[11px]">
                    <div className="font-semibold text-slate-800 truncate max-w-xs">{pr.penyelenggara}</div>
                    {pr.noSertifikat && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                        No: {pr.noSertifikat}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 pr-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewDetail(pr)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Lihat Detail & Piagam"
                      >
                        <Eye size={12} />
                        <span className="hidden sm:inline">Detail</span>
                      </button>
                      <button
                        onClick={() => setEditItem({ ...pr })}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Edit Data"
                      >
                        <Edit size={12} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteItem(pr)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Hapus"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: ADD PRESTASI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Formulir Catatan Prestasi Siswa</h3>
                  <p className="text-xs text-slate-500 font-medium">Pendataan kejuaraan, medali, piagam & poin reward</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1">
              {/* Pilih Siswa */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Pilih Siswa (Dari Master Database)
                </label>
                <select
                  value={formData.siswaId || ''}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Pilih Nama Siswa --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class || 'Kelas -'}) - NIS: {s.nisn || s.nis || '-'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Siswa</label>
                  <input
                    type="text"
                    value={formData.namaSiswa || ''}
                    onChange={(e) => setFormData({ ...formData, namaSiswa: e.target.value })}
                    required
                    placeholder="Nama siswa"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Rombel / Kelas</label>
                  <input
                    type="text"
                    value={formData.kelas || ''}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    required
                    placeholder="Contoh: Kelas 4A"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Kejuaraan / Event Lomba</label>
                <input
                  type="text"
                  value={formData.namaEvent || ''}
                  onChange={(e) => setFormData({ ...formData, namaEvent: e.target.value })}
                  required
                  placeholder="Contoh: Olimpiade Sains Nasional (OSN) Matematika"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Bidang Prestasi</label>
                  <select
                    value={formData.bidang || 'Akademik / Sains'}
                    onChange={(e: any) => setFormData({ ...formData, bidang: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Akademik / Sains">Akademik / Sains</option>
                    <option value="Olahraga">Olahraga</option>
                    <option value="Seni & Budaya">Seni & Budaya</option>
                    <option value="Keagamaan & Tahfidz">Keagamaan & Tahfidz</option>
                    <option value="Riset & Teknologi">Riset & Teknologi</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tingkat Kejuaraan</label>
                  <select
                    value={formData.tingkat || 'Kota / Kab'}
                    onChange={(e: any) => setFormData({ ...formData, tingkat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Sekolah">Sekolah</option>
                    <option value="Kecamatan">Kecamatan</option>
                    <option value="Kota / Kab">Kota / Kabupaten</option>
                    <option value="Provinsi">Provinsi</option>
                    <option value="Nasional">Nasional</option>
                    <option value="Internasional">Internasional</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Capaian / Peringkat</label>
                  <select
                    value={formData.capaian || 'Juara 1 (Emas)'}
                    onChange={(e: any) => setFormData({ ...formData, capaian: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Juara 1 (Emas)">Juara 1 (Emas)</option>
                    <option value="Juara 2 (Perak)">Juara 2 (Perak)</option>
                    <option value="Juara 3 (Perunggu)">Juara 3 (Perunggu)</option>
                    <option value="Harapan 1">Harapan 1</option>
                    <option value="Finalis Terbaik">Finalis Terbaik</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Poin Reward (+)</label>
                  <input
                    type="number"
                    value={formData.poinReward || 50}
                    onChange={(e) => setFormData({ ...formData, poinReward: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Lembaga Penyelenggara</label>
                  <input
                    type="text"
                    value={formData.penyelenggara || ''}
                    onChange={(e) => setFormData({ ...formData, penyelenggara: e.target.value })}
                    placeholder="Contoh: Puspresnas Kemdikbudristek"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">No. Sertifikat / Piagam</label>
                  <input
                    type="text"
                    value={formData.noSertifikat || ''}
                    onChange={(e) => setFormData({ ...formData, noSertifikat: e.target.value })}
                    placeholder="Contoh: 088/OSN-K/2026"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Guru Pembimbing / Pelatih</label>
                <input
                  type="text"
                  value={formData.pembimbing || ''}
                  onChange={(e) => setFormData({ ...formData, pembimbing: e.target.value })}
                  placeholder="Nama guru atau pelatih ekskul..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Prestasi Siswa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DETAIL & PRINT PIAGAM */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Piagam Penghargaan Prestasi Siswa</h3>
                  <p className="text-xs text-slate-500 font-mono">{viewDetail.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewDetail(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 bg-gradient-to-b from-emerald-50/50 to-white rounded-2xl border border-emerald-200/80 space-y-4 text-xs text-center">
              <div className="w-12 h-12 rounded-full bg-amber-400 text-white font-black flex items-center justify-center mx-auto shadow-md text-xl">
                🏆
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-widest bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                  {viewDetail.capaian}
                </span>
                <h4 className="text-lg font-black text-slate-900 mt-2">{viewDetail.namaEvent}</h4>
                <p className="text-xs text-slate-500 font-medium">Tingkat {viewDetail.tingkat} • Bidang {viewDetail.bidang}</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-slate-400 text-[10px] font-black uppercase">Dianugerahkan Kepada:</span>
                <div className="text-base font-black text-slate-900">{viewDetail.namaSiswa}</div>
                <div className="text-xs text-slate-600 font-semibold">{viewDetail.kelas} • NIS: {viewDetail.nis}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left pt-1">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-black uppercase text-slate-400">Penyelenggara</span>
                  <div className="font-bold text-slate-800 mt-0.5">{viewDetail.penyelenggara}</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-black uppercase text-slate-400">Poin Apresiasi</span>
                  <div className="font-mono font-black text-emerald-700 mt-0.5">+{viewDetail.poinReward} Poin Karakter</div>
                </div>
              </div>

              {viewDetail.noSertifikat && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Nomor Registrasi Sertifikat: <strong>{viewDetail.noSertifikat}</strong>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak Lembar Piagam</span>
              </button>
              <button
                onClick={() => setViewDetail(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Edit Prestasi: {editItem.namaSiswa}</h3>
              </div>
              <button 
                onClick={() => setEditItem(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Siswa</label>
                  <input
                    type="text"
                    value={editItem.namaSiswa || ''}
                    onChange={(e) => setEditItem({ ...editItem, namaSiswa: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kelas</label>
                  <input
                    type="text"
                    value={editItem.kelas || ''}
                    onChange={(e) => setEditItem({ ...editItem, kelas: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Kejuaraan / Event</label>
                <input
                  type="text"
                  value={editItem.namaEvent || ''}
                  onChange={(e) => setEditItem({ ...editItem, namaEvent: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Capaian Juara</label>
                  <select
                    value={editItem.capaian || 'Juara 1 (Emas)'}
                    onChange={(e: any) => setEditItem({ ...editItem, capaian: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    <option value="Juara 1 (Emas)">Juara 1 (Emas)</option>
                    <option value="Juara 2 (Perak)">Juara 2 (Perak)</option>
                    <option value="Juara 3 (Perunggu)">Juara 3 (Perunggu)</option>
                    <option value="Harapan 1">Harapan 1</option>
                    <option value="Finalis Terbaik">Finalis Terbaik</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Poin Reward (+)</label>
                  <input
                    type="number"
                    value={editItem.poinReward || 50}
                    onChange={(e) => setEditItem({ ...editItem, poinReward: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <Trash2 size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Hapus Catatan Prestasi</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data prestasi <strong className="text-slate-800">"{deleteItem.id} - {deleteItem.namaEvent} ({deleteItem.namaSiswa})"</strong>?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-1"
              >
                <Trash2 size={14} />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
