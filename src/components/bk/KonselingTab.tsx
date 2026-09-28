import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { BkKonseling } from '../../data/bkSeed';
import { useStore } from '../../store';
import { 
  HeartHandshake, Search, Plus, Filter, X, Eye, Edit, Trash2, Save, Printer, 
  CheckCircle2, Clock, AlertCircle, Calendar, User, FileText
} from 'lucide-react';
import { getAllClasses, formatClassLabel, matchClass } from '../../lib/utils';

interface KonselingTabProps {
  onRefreshAll?: () => void;
}

export default function KonselingTab({ onRefreshAll }: KonselingTabProps) {
  const { students } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const availableClasses = useMemo(() => getAllClasses(students), [students]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<BkKonseling | null>(null);
  const [editItem, setEditItem] = useState<BkKonseling | null>(null);
  const [deleteItem, setDeleteItem] = useState<BkKonseling | null>(null);

  // Form State for Add
  const [formData, setFormData] = useState<Partial<BkKonseling>>({
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '09:00 WIB',
    siswaId: '',
    namaSiswa: '',
    nis: '',
    kelas: '',
    konselor: '',
    jenisKonseling: 'Individu',
    pokokMasalah: '',
    urgensi: 'Biasa',
    hasilTindakLanjut: '',
    status: 'DALAM PROSES',
    catatanRahasia: '',
  });

  const konselingList = useMemo(() => {
    return db.get<BkKonseling>('bk_konseling') || [];
  }, []);

  const [dataList, setDataList] = useState<BkKonseling[]>(konselingList);

  const saveToDb = (newList: BkKonseling[]) => {
    setDataList(newList);
    db.set('bk_konseling', newList);
    // update bimbingan legacy list
    const legacy = (db.get('bimbingan') as any[]) || [];
    const others = legacy.filter((b: any) => b.jenis !== 'Konseling');
    const newLegacy = [
      ...others,
      ...newList.map(k => ({
        id: k.id,
        nama: k.namaSiswa,
        kelas: k.kelas,
        jenis: 'Konseling',
        judul: k.pokokMasalah,
        tgl: k.tanggal,
        poin: '0',
        status: k.status,
        keterangan: k.hasilTindakLanjut
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
        item.pokokMasalah.toLowerCase().includes(q) ||
        item.nis.toLowerCase().includes(q);
      const matchKelas = !filterKelas || matchClass(item.kelas, filterKelas);
      const matchJenis = !filterJenis || item.jenisKonseling === filterJenis;
      const matchStatus = !filterStatus || item.status === filterStatus;
      return matchSearch && matchKelas && matchJenis && matchStatus;
    });
  }, [dataList, searchTerm, filterKelas, filterJenis, filterStatus]);

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

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaSiswa || !formData.pokokMasalah) {
      alert('Nama siswa dan pokok masalah wajib diisi.');
      return;
    }
    const newId = `KSL-${new Date().getFullYear()}-${String(dataList.length + 1).padStart(3, '0')}`;
    const newItem: BkKonseling = {
      id: newId,
      tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
      waktu: formData.waktu || '09:00 WIB',
      siswaId: formData.siswaId || String(Date.now()),
      namaSiswa: formData.namaSiswa || '',
      nis: formData.nis || '-',
      kelas: formData.kelas || '',
      konselor: formData.konselor || '',
      jenisKonseling: formData.jenisKonseling || 'Individu',
      pokokMasalah: formData.pokokMasalah || '',
      urgensi: formData.urgensi || 'Biasa',
      hasilTindakLanjut: formData.hasilTindakLanjut || '',
      status: formData.status || 'DALAM PROSES',
      catatanRahasia: formData.catatanRahasia || '',
      createdAt: new Date().toISOString(),
    };
    saveToDb([newItem, ...dataList]);
    setIsAddModalOpen(false);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      waktu: '09:00 WIB',
      siswaId: '',
      namaSiswa: '',
      nis: '',
      kelas: '',
      konselor: '',
      jenisKonseling: 'Individu',
      pokokMasalah: '',
      urgensi: 'Biasa',
      hasilTindakLanjut: '',
      status: 'DALAM PROSES',
      catatanRahasia: '',
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
            <HeartHandshake className="text-rose-600" size={20} />
            Layanan Konseling & Pendampingan Siswa
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Daftar sesi bimbingan psikologis, masalah belajar, pergaulan, dan konsultasi wali murid
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
        >
          <Plus size={15} />
          <span>Buat Sesi Konseling Baru</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari siswa, NIS, masalah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="">Semua Rombel / Kelas</option>
            {availableClasses.map(c => <option key={c} value={c}>{formatClassLabel(c)}</option>)}
          </select>

          <select
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="">Semua Jenis Konseling</option>
            <option value="Individu">Individu</option>
            <option value="Bimbingan Belajar">Bimbingan Belajar</option>
            <option value="Bimbingan Pribadi-Sosial">Bimbingan Pribadi-Sosial</option>
            <option value="Bimbingan Karir">Bimbingan Karir</option>
            <option value="Konsultasi Ortu">Konsultasi Ortu</option>
            <option value="Kelompok">Kelompok</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="">Semua Status</option>
            <option value="SELESAI">Selesai</option>
            <option value="DALAM PROSES">Dalam Proses</option>
            <option value="TERJADWAL">Terjadwal</option>
            <option value="RUJUK AHLI">Rujuk Ahli</option>
          </select>
        </div>

        <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 whitespace-nowrap">
          Menampilkan {filteredList.length} Sesi
        </span>
      </div>

      {/* Specific Konseling Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
            <tr>
              <th className="p-3.5 pl-4">No Sesi</th>
              <th className="p-3.5">Tanggal & Waktu</th>
              <th className="p-3.5">Nama Siswa & NIS</th>
              <th className="p-3.5">Rombel</th>
              <th className="p-3.5">Konselor</th>
              <th className="p-3.5">Jenis Layanan</th>
              <th className="p-3.5">Pokok Masalah</th>
              <th className="p-3.5 text-center">Urgensi</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 pr-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-slate-400">
                  <HeartHandshake size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600 text-sm">Tidak Ada Data Konseling</p>
                  <p className="text-xs text-slate-400 mt-0.5">Silakan buat sesi konseling baru atau sesuaikan filter.</p>
                </td>
              </tr>
            ) : (
              filteredList.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 pl-4 font-mono font-bold text-rose-700">{k.id}</td>
                  <td className="p-3.5">
                    <div className="font-mono text-slate-900 font-semibold">{k.tanggal}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{k.waktu || 'Pagi'}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 text-sm">{k.namaSiswa}</div>
                    <div className="text-[10px] text-slate-400 font-mono">NIS: {k.nis}</div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">{k.kelas}</td>
                  <td className="p-3.5 text-slate-700 font-medium text-[11px]">{k.konselor}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 font-bold rounded-lg text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                      {k.jenisKonseling}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-800 font-medium max-w-xs truncate" title={k.pokokMasalah}>
                    {k.pokokMasalah}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${
                      k.urgensi === 'Mendesak' ? 'bg-red-100 text-red-800' :
                      k.urgensi === 'Penting' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {k.urgensi}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      k.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800' :
                      k.status === 'DALAM PROSES' ? 'bg-blue-100 text-blue-800' :
                      k.status === 'TERJADWAL' ? 'bg-amber-100 text-amber-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {k.status}
                    </span>
                  </td>
                  <td className="p-3.5 pr-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewDetail(k)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Lihat Detail & Cetak"
                      >
                        <Eye size={12} />
                        <span className="hidden sm:inline">Detail</span>
                      </button>
                      <button
                        onClick={() => setEditItem({ ...k })}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Edit Data"
                      >
                        <Edit size={12} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteItem(k)}
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

      {/* MODAL: ADD KONSELING */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Formulir Sesi Konseling Siswa</h3>
                  <p className="text-xs text-slate-500 font-medium">Dokumentasi pendampingan konselor & bimbingan siswa</p>
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nama Siswa Manual</label>
                  <input
                    type="text"
                    value={formData.namaSiswa || ''}
                    onChange={(e) => setFormData({ ...formData, namaSiswa: e.target.value })}
                    required
                    placeholder="Nama siswa"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tanggal Sesi</label>
                  <input
                    type="date"
                    value={formData.tanggal || ''}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Waktu Pelaksanaan</label>
                  <input
                    type="text"
                    value={formData.waktu || ''}
                    onChange={(e) => setFormData({ ...formData, waktu: e.target.value })}
                    placeholder="Contoh: 09:30 WIB"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Guru Konselor</label>
                  <input
                    type="text"
                    value={formData.konselor || ''}
                    onChange={(e) => setFormData({ ...formData, konselor: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jenis Layanan</label>
                  <select
                    value={formData.jenisKonseling || 'Individu'}
                    onChange={(e: any) => setFormData({ ...formData, jenisKonseling: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="Individu">Individu</option>
                    <option value="Bimbingan Belajar">Bimbingan Belajar</option>
                    <option value="Bimbingan Pribadi-Sosial">Bimbingan Pribadi-Sosial</option>
                    <option value="Bimbingan Karir">Bimbingan Karir</option>
                    <option value="Konsultasi Ortu">Konsultasi Ortu</option>
                    <option value="Kelompok">Kelompok</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Pokok Permasalahan / Topik Konseling</label>
                <textarea
                  value={formData.pokokMasalah || ''}
                  onChange={(e) => setFormData({ ...formData, pokokMasalah: e.target.value })}
                  required
                  rows={2}
                  placeholder="Uraikan keluhan, masalah belajar, pergaulan, atau kebutuhan bimbingan..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tingkat Urgensi</label>
                  <select
                    value={formData.urgensi || 'Biasa'}
                    onChange={(e: any) => setFormData({ ...formData, urgensi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="Biasa">Biasa</option>
                    <option value="Penting">Penting</option>
                    <option value="Mendesak">Mendesak</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status Sesi</label>
                  <select
                    value={formData.status || 'DALAM PROSES'}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="DALAM PROSES">Dalam Proses</option>
                    <option value="SELESAI">Selesai</option>
                    <option value="TERJADWAL">Terjadwal</option>
                    <option value="RUJUK AHLI">Rujuk Ahli</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Hasil / Tindak Lanjut Solusi</label>
                <textarea
                  value={formData.hasilTindakLanjut || ''}
                  onChange={(e) => setFormData({ ...formData, hasilTindakLanjut: e.target.value })}
                  rows={2}
                  placeholder="Rencana tindak lanjut, komitmen siswa, atau kesepakatan dengan orang tua..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Sesi Konseling</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DETAIL & PRINT */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Lembar Bimbingan & Konseling</h3>
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
                  <span className="text-slate-400 text-[10px] font-black uppercase">Tanggal & Waktu</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{viewDetail.tanggal} • {viewDetail.waktu}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Konselor Pembimbing</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{viewDetail.konselor}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-slate-200/60 pb-2.5">
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Jenis Layanan</span>
                  <div className="font-bold text-rose-700 mt-0.5">{viewDetail.jenisKonseling}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Status & Urgensi</span>
                  <div className="font-bold text-slate-900 mt-0.5">{viewDetail.status} • Urgensi: {viewDetail.urgensi}</div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] font-black uppercase">Pokok Permasalahan</span>
                <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium">
                  {viewDetail.pokokMasalah}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] font-black uppercase">Hasil & Tindak Lanjut</span>
                <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium">
                  {viewDetail.hasilTindakLanjut}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak Lembar BK</span>
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
                <h3 className="text-base font-black text-slate-900">Edit Sesi: {editItem.namaSiswa}</h3>
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kelas</label>
                  <input
                    type="text"
                    value={editItem.kelas || ''}
                    onChange={(e) => setEditItem({ ...editItem, kelas: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Jenis Layanan</label>
                  <select
                    value={editItem.jenisKonseling || 'Individu'}
                    onChange={(e: any) => setEditItem({ ...editItem, jenisKonseling: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    <option value="Individu">Individu</option>
                    <option value="Bimbingan Belajar">Bimbingan Belajar</option>
                    <option value="Bimbingan Pribadi-Sosial">Bimbingan Pribadi-Sosial</option>
                    <option value="Bimbingan Karir">Bimbingan Karir</option>
                    <option value="Konsultasi Ortu">Konsultasi Ortu</option>
                    <option value="Kelompok">Kelompok</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status Sesi</label>
                  <select
                    value={editItem.status || 'DALAM PROSES'}
                    onChange={(e: any) => setEditItem({ ...editItem, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    <option value="DALAM PROSES">Dalam Proses</option>
                    <option value="SELESAI">Selesai</option>
                    <option value="TERJADWAL">Terjadwal</option>
                    <option value="RUJUK AHLI">Rujuk Ahli</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Pokok Permasalahan</label>
                <textarea
                  value={editItem.pokokMasalah || ''}
                  onChange={(e) => setEditItem({ ...editItem, pokokMasalah: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Hasil Tindak Lanjut</label>
                <textarea
                  value={editItem.hasilTindakLanjut || ''}
                  onChange={(e) => setEditItem({ ...editItem, hasilTindakLanjut: e.target.value })}
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
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
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Hapus Sesi Konseling</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus sesi konseling <strong className="text-slate-800">"{deleteItem.id} - {deleteItem.namaSiswa}"</strong>?
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
