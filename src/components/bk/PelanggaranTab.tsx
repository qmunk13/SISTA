import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { BkPelanggaran } from '../../data/bkSeed';
import { useStore } from '../../store';
import { 
  AlertTriangle, Search, Plus, Filter, X, Eye, Edit, Trash2, Save, Printer, 
  Flame, ShieldAlert, CheckCircle2, Clock, Calendar, FileText
} from 'lucide-react';
import { getAllClasses, formatClassLabel, matchClass } from '../../lib/utils';

interface PelanggaranTabProps {
  onRefreshAll?: () => void;
}

export default function PelanggaranTab({ onRefreshAll }: PelanggaranTabProps) {
  const { students } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterKlasifikasi, setFilterKlasifikasi] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const availableClasses = useMemo(() => getAllClasses(students), [students]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<BkPelanggaran | null>(null);
  const [editItem, setEditItem] = useState<BkPelanggaran | null>(null);
  const [deleteItem, setDeleteItem] = useState<BkPelanggaran | null>(null);

  // Form State for Add
  const [formData, setFormData] = useState<Partial<BkPelanggaran>>({
    tanggal: new Date().toISOString().split('T')[0],
    jam: '07:30 WIB',
    siswaId: '',
    namaSiswa: '',
    nis: '',
    kelas: '',
    klasifikasi: 'Ringan',
    bentukPelanggaran: '',
    poin: -10,
    sanksi: '',
    petugasPelapor: '',
    status: 'DALAM PEMANTAUAN',
    tindakLanjutOrtu: '',
  });

  const pelanggaranList = useMemo(() => {
    return db.get<BkPelanggaran>('bk_pelanggaran') || [];
  }, []);

  const [dataList, setDataList] = useState<BkPelanggaran[]>(pelanggaranList);

  const saveToDb = (newList: BkPelanggaran[]) => {
    setDataList(newList);
    db.set('bk_pelanggaran', newList);
    // update bimbingan legacy list
    const legacy = (db.get('bimbingan') as any[]) || [];
    const others = legacy.filter((b: any) => b.jenis !== 'Pelanggaran');
    const newLegacy = [
      ...others,
      ...newList.map(p => ({
        id: p.id,
        nama: p.namaSiswa,
        kelas: p.kelas,
        jenis: 'Pelanggaran',
        judul: p.bentukPelanggaran,
        tgl: p.tanggal,
        poin: `${p.poin}`,
        status: p.status,
        keterangan: p.sanksi
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
        item.bentukPelanggaran.toLowerCase().includes(q) ||
        item.nis.toLowerCase().includes(q);
      const matchKelas = !filterKelas || matchClass(item.kelas, filterKelas);
      const matchKlasifikasi = !filterKlasifikasi || item.klasifikasi === filterKlasifikasi;
      const matchStatus = !filterStatus || item.status === filterStatus;
      return matchSearch && matchKelas && matchKlasifikasi && matchStatus;
    });
  }, [dataList, searchTerm, filterKelas, filterKlasifikasi, filterStatus]);

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

  // Preset Violations with Default Points & Sanctions
  const violationPresets = [
    { label: 'Terlambat masuk sekolah (>15 menit)', klasifikasi: 'Ringan', poin: -5, sanksi: 'Teguran lisan, membaca ikrar & literasi di perpustakaan' },
    { label: 'Tidak memakai atribut seragam lengkap', klasifikasi: 'Ringan', poin: -5, sanksi: 'Teguran lisan dan merapikan atribut seragam' },
    { label: 'Membuang sampah sembarangan / piket tidak tuntas', klasifikasi: 'Ringan', poin: -5, sanksi: 'Membersihkan area koridor madrasah' },
    { label: 'Meninggalkan kelas / membolos jam pelajaran', klasifikasi: 'Sedang', poin: -15, sanksi: 'Pembinaan wali kelas dan membuat resume materi yang tertinggal' },
    { label: 'Membawa gawai tanpa izin saat KBM', klasifikasi: 'Sedang', poin: -10, sanksi: 'Gawai disimpan di ruang BK & diambil oleh orang tua' },
    { label: 'Perkataan kasar / tidak sopan kepada teman', klasifikasi: 'Sedang', poin: -15, sanksi: 'Pembinaan karakter dan surat permohonan maaf tertulis' },
    { label: 'Perkelahian / tawuran antar siswa', klasifikasi: 'Berat', poin: -35, sanksi: 'Panggilan Orang Tua, Surat Peringatan (SP1) & konseling intensif' },
    { label: 'Membawa rokok / vape di lingkungan sekolah', klasifikasi: 'Berat', poin: -30, sanksi: 'Panggilan Orang Tua, SP1 & skorsing 3 hari' },
    { label: 'Tindakan bullying / intimidasi fisik/verbal', klasifikasi: 'Sangat Berat', poin: -50, sanksi: 'Panggilan Orang Tua, SP2, skorsing & pemantauan khusus BK' },
  ];

  const handleApplyPreset = (preset: typeof violationPresets[0]) => {
    setFormData(prev => ({
      ...prev,
      bentukPelanggaran: preset.label,
      klasifikasi: preset.klasifikasi as any,
      poin: preset.poin,
      sanksi: preset.sanksi,
    }));
  };

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaSiswa || !formData.bentukPelanggaran) {
      alert('Nama siswa dan bentuk pelanggaran wajib diisi.');
      return;
    }
    const newId = `PLG-${new Date().getFullYear()}-${String(dataList.length + 1).padStart(3, '0')}`;
    const newItem: BkPelanggaran = {
      id: newId,
      tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
      jam: formData.jam || '07:30 WIB',
      siswaId: formData.siswaId || String(Date.now()),
      namaSiswa: formData.namaSiswa || '',
      nis: formData.nis || '-',
      kelas: formData.kelas || 'Kelas 4A',
      klasifikasi: formData.klasifikasi || 'Ringan',
      bentukPelanggaran: formData.bentukPelanggaran || '',
      poin: Number(formData.poin) || -10,
      sanksi: formData.sanksi || '',
      petugasPelapor: formData.petugasPelapor || '',
      status: formData.status || 'DALAM PEMANTAUAN',
      tindakLanjutOrtu: formData.tindakLanjutOrtu || '',
      createdAt: new Date().toISOString(),
    };
    saveToDb([newItem, ...dataList]);
    setIsAddModalOpen(false);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      jam: '07:30 WIB',
      siswaId: '',
      namaSiswa: '',
      nis: '',
      kelas: '',
      klasifikasi: 'Ringan',
      bentukPelanggaran: '',
      poin: -10,
      sanksi: '',
      petugasPelapor: '',
      status: 'DALAM PEMANTAUAN',
      tindakLanjutOrtu: '',
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
            <AlertTriangle className="text-amber-600" size={20} />
            Catatan Kedisiplinan & Poin Pelanggaran Tata Tertib
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pendataan pelanggaran, sanksi pembinaan edukatif, pengurangan poin, dan surat peringatan
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
        >
          <Plus size={15} />
          <span>Catat Pelanggaran Siswa</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari siswa, NIS, bentuk pelanggaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="">Semua Rombel / Kelas</option>
            {availableClasses.map(c => <option key={c} value={c}>{formatClassLabel(c)}</option>)}
          </select>

          <select
            value={filterKlasifikasi}
            onChange={(e) => setFilterKlasifikasi(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="">Semua Klasifikasi</option>
            <option value="Ringan">Ringan (5 - 15 Poin)</option>
            <option value="Sedang">Sedang (16 - 30 Poin)</option>
            <option value="Berat">Berat (31 - 50 Poin)</option>
            <option value="Sangat Berat">Sangat Berat (50+ Poin)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="">Semua Status</option>
            <option value="SELESAI PEMBINAAN">Selesai Pembinaan</option>
            <option value="DALAM PEMANTAUAN">Dalam Pemantauan</option>
            <option value="MENUNGGU ORTU">Menunggu Ortu</option>
            <option value="SP DITERBITKAN">SP Diterbitkan</option>
          </select>
        </div>

        <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 whitespace-nowrap">
          Menampilkan {filteredList.length} Catatan Kasus
        </span>
      </div>

      {/* Specific Pelanggaran Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
            <tr>
              <th className="p-3.5 pl-4">No Kasus</th>
              <th className="p-3.5">Tanggal & Jam</th>
              <th className="p-3.5">Nama Siswa & NIS</th>
              <th className="p-3.5">Rombel</th>
              <th className="p-3.5 text-center">Klasifikasi</th>
              <th className="p-3.5">Bentuk Pelanggaran</th>
              <th className="p-3.5 text-center">Poin (-)</th>
              <th className="p-3.5">Sanksi Edukatif</th>
              <th className="p-3.5">Petugas Pelapor</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 pr-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-10 text-center text-slate-400">
                  <AlertTriangle size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600 text-sm">Tidak Ada Catatan Pelanggaran</p>
                  <p className="text-xs text-slate-400 mt-0.5">Seluruh siswa mematuhi tata tertib dengan baik.</p>
                </td>
              </tr>
            ) : (
              filteredList.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 pl-4 font-mono font-bold text-amber-700">{p.id}</td>
                  <td className="p-3.5">
                    <div className="font-mono text-slate-900 font-semibold">{p.tanggal}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.jam || '07:30'}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 text-sm">{p.namaSiswa}</div>
                    <div className="text-[10px] text-slate-400 font-mono">NIS: {p.nis}</div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">{p.kelas}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 font-black uppercase rounded-md text-[9px] ${
                      p.klasifikasi === 'Sangat Berat' ? 'bg-red-100 text-red-800 border border-red-200' :
                      p.klasifikasi === 'Berat' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      p.klasifikasi === 'Sedang' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {p.klasifikasi}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-800 font-medium max-w-xs truncate" title={p.bentukPelanggaran}>
                    {p.bentukPelanggaran}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      {p.poin > 0 ? `-${p.poin}` : `${p.poin}`}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-700 text-xs max-w-xs truncate" title={p.sanksi}>
                    {p.sanksi}
                  </td>
                  <td className="p-3.5 text-slate-600 text-[11px] whitespace-nowrap">{p.petugasPelapor}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      p.status === 'SELESAI PEMBINAAN' ? 'bg-emerald-100 text-emerald-800' :
                      p.status === 'DALAM PEMANTAUAN' ? 'bg-blue-100 text-blue-800' :
                      p.status === 'MENUNGGU ORTU' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3.5 pr-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewDetail(p)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Lihat Detail & Cetak SP"
                      >
                        <Eye size={12} />
                        <span className="hidden sm:inline">Detail</span>
                      </button>
                      <button
                        onClick={() => setEditItem({ ...p })}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Edit Data"
                      >
                        <Edit size={12} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteItem(p)}
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

      {/* MODAL: ADD PELANGGARAN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Formulir Catatan Pelanggaran Siswa</h3>
                  <p className="text-xs text-slate-500 font-medium">Pencatatan pelanggaran disiplin & pembinaan tata tertib</p>
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Template Pelanggaran Cepat */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                  Template Standar Tata Tertib (Klik untuk otomatis isi):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {violationPresets.slice(0, 5).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2 py-1 bg-white hover:bg-amber-100 text-slate-800 rounded-lg text-[10px] font-bold border border-amber-200 transition"
                    >
                      {preset.label.split('(')[0]} ({preset.poin} Poin)
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Bentuk Pelanggaran</label>
                <textarea
                  value={formData.bentukPelanggaran || ''}
                  onChange={(e) => setFormData({ ...formData, bentukPelanggaran: e.target.value })}
                  required
                  rows={2}
                  placeholder="Uraikan perbuatan atau tata tertib yang dilanggar..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Klasifikasi Kasus</label>
                  <select
                    value={formData.klasifikasi || 'Ringan'}
                    onChange={(e: any) => setFormData({ ...formData, klasifikasi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="Ringan">Ringan (5 - 15 Poin)</option>
                    <option value="Sedang">Sedang (16 - 30 Poin)</option>
                    <option value="Berat">Berat (31 - 50 Poin)</option>
                    <option value="Sangat Berat">Sangat Berat (50+ Poin)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Poin Pengurangan (Minus)</label>
                  <input
                    type="number"
                    value={formData.poin || -10}
                    onChange={(e) => setFormData({ ...formData, poin: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Sanksi Edukatif & Pembinaan</label>
                <textarea
                  value={formData.sanksi || ''}
                  onChange={(e) => setFormData({ ...formData, sanksi: e.target.value })}
                  rows={2}
                  placeholder="Bentuk sanksi mendidik, tugas literasi, pemanggilan orang tua, atau SP..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Petugas Pelapor / Pencatat</label>
                  <input
                    type="text"
                    value={formData.petugasPelapor || ''}
                    onChange={(e) => setFormData({ ...formData, petugasPelapor: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status Penyelesaian</label>
                  <select
                    value={formData.status || 'DALAM PEMANTAUAN'}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="DALAM PEMANTAUAN">Dalam Pemantauan</option>
                    <option value="SELESAI PEMBINAAN">Selesai Pembinaan</option>
                    <option value="MENUNGGU ORTU">Menunggu Ortu</option>
                    <option value="SP DITERBITKAN">SP Diterbitkan</option>
                  </select>
                </div>
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Catatan Pelanggaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DETAIL & PRINT SURAT */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Surat Catatan Kedisiplinan Siswa</h3>
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

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-200/60 pb-2.5">
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Nama Siswa</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">{viewDetail.namaSiswa}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Kelas / Rombel</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">{viewDetail.kelas} (NIS: {viewDetail.nis})</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-slate-200/60 pb-2.5">
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Tanggal & Jam</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{viewDetail.tanggal} • {viewDetail.jam}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Petugas Pencatat</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{viewDetail.petugasPelapor}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-slate-200/60 pb-2.5">
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Klasifikasi & Poin</span>
                  <div className="font-bold text-rose-700 mt-0.5">
                    {viewDetail.klasifikasi} ({viewDetail.poin} Poin)
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Status Penyelesaian</span>
                  <div className="font-bold text-slate-900 mt-0.5">{viewDetail.status}</div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] font-black uppercase">Uraian Pelanggaran</span>
                <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium">
                  {viewDetail.bentukPelanggaran}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] font-black uppercase">Sanksi Edukatif & Pembinaan</span>
                <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium">
                  {viewDetail.sanksi}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak Lembar SP / Panggilan</span>
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
                <h3 className="text-base font-black text-slate-900">Edit Pelanggaran: {editItem.namaSiswa}</h3>
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
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Bentuk Pelanggaran</label>
                <textarea
                  value={editItem.bentukPelanggaran || ''}
                  onChange={(e) => setEditItem({ ...editItem, bentukPelanggaran: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Poin (-)</label>
                  <input
                    type="number"
                    value={editItem.poin || -10}
                    onChange={(e) => setEditItem({ ...editItem, poin: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status Kasus</label>
                  <select
                    value={editItem.status || 'DALAM PEMANTAUAN'}
                    onChange={(e: any) => setEditItem({ ...editItem, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    <option value="DALAM PEMANTAUAN">Dalam Pemantauan</option>
                    <option value="SELESAI PEMBINAAN">Selesai Pembinaan</option>
                    <option value="MENUNGGU ORTU">Menunggu Ortu</option>
                    <option value="SP DITERBITKAN">SP Diterbitkan</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Sanksi Edukatif</label>
                <textarea
                  value={editItem.sanksi || ''}
                  onChange={(e) => setEditItem({ ...editItem, sanksi: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
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
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <Trash2 size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Hapus Catatan Pelanggaran</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus catatan pelanggaran <strong className="text-slate-800">"{deleteItem.id} - {deleteItem.namaSiswa}"</strong>?
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
