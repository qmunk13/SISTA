import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { BkKarir } from '../../data/bkSeed';
import { useStore } from '../../store';
import { 
  Compass, Search, Plus, Filter, X, Eye, Edit, Trash2, Save, Printer, 
  GraduationCap, Briefcase, Lightbulb, Target, Calendar, FileText
} from 'lucide-react';

interface KarirRekomendasiTabProps {
  onRefreshAll?: () => void;
}

export default function KarirRekomendasiTab({ onRefreshAll }: KarirRekomendasiTabProps) {
  const { students } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<BkKarir | null>(null);
  const [editItem, setEditItem] = useState<BkKarir | null>(null);
  const [deleteItem, setDeleteItem] = useState<BkKarir | null>(null);

  // Form State for Add
  const [formData, setFormData] = useState<Partial<BkKarir>>({
    tanggal: new Date().toISOString().split('T')[0],
    siswaId: '',
    namaSiswa: '',
    nis: '',
    kelas: '',
    tipeKepribadian: 'Investigatif & Analitis (Logika Tinggi)',
    minatBakat: 'Sains, Pemrograman & Logika Komputasi',
    citaCita: 'Software Engineer / Peneliti Sains',
    rekomendasiStudi: 'S1 Teknik Informatika / Ilmu Komputer',
    rekomendasiKampusKarir: 'Institut Teknologi Bandung (ITB) / Universitas Indonesia (UI)',
    catatanKonselor: 'Nilai mata pelajaran sains & eksakta sangat menonjol, dianjurkan memperkuat portofolio kompetisi.',
    status: 'TERPETAKAN',
  });

  const karirList = useMemo(() => {
    return db.get<BkKarir>('bk_karir') || [];
  }, []);

  const [dataList, setDataList] = useState<BkKarir[]>(karirList);

  const saveToDb = (newList: BkKarir[]) => {
    setDataList(newList);
    db.set('bk_karir', newList);
    // update bimbingan legacy list
    const legacy = (db.get('bimbingan') as any[]) || [];
    const others = legacy.filter((b: any) => b.jenis !== 'Rekomendasi Karir');
    const newLegacy = [
      ...others,
      ...newList.map(kr => ({
        id: kr.id,
        nama: kr.namaSiswa,
        kelas: kr.kelas,
        jenis: 'Rekomendasi Karir',
        judul: `Target: ${kr.citaCita} (${kr.rekomendasiStudi})`,
        tgl: kr.tanggal,
        poin: '0',
        status: kr.status,
        keterangan: kr.catatanKonselor
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
        item.citaCita.toLowerCase().includes(q) ||
        item.rekomendasiStudi.toLowerCase().includes(q) ||
        item.nis.toLowerCase().includes(q);
      const matchKelas = !filterKelas || item.kelas === filterKelas;
      const matchStatus = !filterStatus || item.status === filterStatus;
      return matchSearch && matchKelas && matchStatus;
    });
  }, [dataList, searchTerm, filterKelas, filterStatus]);

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

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaSiswa || !formData.citaCita) {
      alert('Nama siswa dan target cita-cita wajib diisi.');
      return;
    }
    const newId = `KRR-${new Date().getFullYear()}-${String(dataList.length + 1).padStart(3, '0')}`;
    const newItem: BkKarir = {
      id: newId,
      tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
      siswaId: formData.siswaId || String(Date.now()),
      namaSiswa: formData.namaSiswa || '',
      nis: formData.nis || '-',
      kelas: formData.kelas || 'Kelas 4A',
      tipeKepribadian: formData.tipeKepribadian || 'Investigatif & Analitis',
      minatBakat: formData.minatBakat || 'Sains & Teknologi',
      citaCita: formData.citaCita || '',
      rekomendasiStudi: formData.rekomendasiStudi || 'S1 Perguruan Tinggi',
      rekomendasiKampusKarir: formData.rekomendasiKampusKarir || 'PTN Unggulan / Vokasi',
      catatanKonselor: formData.catatanKonselor || 'Telah dipetakan berdasarkan konsultasi bimbingan karir.',
      status: formData.status || 'TERPETAKAN',
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
      tipeKepribadian: 'Investigatif & Analitis (Logika Tinggi)',
      minatBakat: 'Sains, Pemrograman & Logika Komputasi',
      citaCita: 'Software Engineer / Peneliti Sains',
      rekomendasiStudi: 'S1 Teknik Informatika / Ilmu Komputer',
      rekomendasiKampusKarir: 'Institut Teknologi Bandung (ITB) / Universitas Indonesia (UI)',
      catatanKonselor: 'Nilai mata pelajaran sains & eksakta sangat menonjol, dianjurkan memperkuat portofolio kompetisi.',
      status: 'TERPETAKAN',
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
            <Compass className="text-blue-600" size={20} />
            Bimbingan Karir, Minat Bakat & Rekomendasi Studi Lanjut
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pemetaan kepribadian, potensi bakat Siswa, target profesi masa depan, dan rekomendasi jalur pendidikan
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
        >
          <Plus size={15} />
          <span>Input Asesmen Karir Siswa</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari siswa, NIS, cita-cita, jurusan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Semua Rombel / Kelas</option>
            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Semua Status Rekomendasi</option>
            <option value="TERPETAKAN">Terpetakan</option>
            <option value="KONSULTASI LANJUTAN">Konsultasi Lanjutan</option>
            <option value="PERSIAPAN DAFTAR">Persiapan Daftar</option>
            <option value="SELESAI REKOMENDASI">Selesai Rekomendasi</option>
          </select>
        </div>

        <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 whitespace-nowrap">
          Menampilkan {filteredList.length} Asesmen
        </span>
      </div>

      {/* Specific Karir Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
            <tr>
              <th className="p-3.5 pl-4">No Asesmen</th>
              <th className="p-3.5">Tanggal</th>
              <th className="p-3.5">Nama Siswa & NIS</th>
              <th className="p-3.5">Rombel</th>
              <th className="p-3.5">Tipe Kepribadian</th>
              <th className="p-3.5">Minat & Bakat</th>
              <th className="p-3.5">Target Cita-cita</th>
              <th className="p-3.5">Rekomendasi Jurusan / Kampus</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 pr-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-slate-400">
                  <Compass size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600 text-sm">Belum Ada Asesmen Karir</p>
                  <p className="text-xs text-slate-400 mt-0.5">Input pemetaan minat bakat untuk memandu pilihan studi siswa.</p>
                </td>
              </tr>
            ) : (
              filteredList.map((kr) => (
                <tr key={kr.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 pl-4 font-mono font-bold text-blue-700">{kr.id}</td>
                  <td className="p-3.5 font-mono text-slate-900 font-semibold">{kr.tanggal}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 text-sm">{kr.namaSiswa}</div>
                    <div className="text-[10px] text-slate-400 font-mono">NIS: {kr.nis}</div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">{kr.kelas}</td>
                  <td className="p-3.5 text-slate-700 font-medium text-[11px] max-w-xs truncate" title={kr.tipeKepribadian}>
                    {kr.tipeKepribadian}
                  </td>
                  <td className="p-3.5 text-slate-800 font-medium max-w-xs truncate" title={kr.minatBakat}>
                    {kr.minatBakat}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 text-xs">
                    {kr.citaCita}
                  </td>
                  <td className="p-3.5 text-slate-700">
                    <div className="font-bold text-blue-900 text-xs truncate max-w-xs">{kr.rekomendasiStudi}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">{kr.rekomendasiKampusKarir}</div>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      kr.status === 'SELESAI REKOMENDASI' ? 'bg-emerald-100 text-emerald-800' :
                      kr.status === 'PERSIAPAN DAFTAR' ? 'bg-indigo-100 text-indigo-800' :
                      kr.status === 'TERPETAKAN' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {kr.status}
                    </span>
                  </td>
                  <td className="p-3.5 pr-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewDetail(kr)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Lihat Detail & Cetak Lembar Karir"
                      >
                        <Eye size={12} />
                        <span className="hidden sm:inline">Detail</span>
                      </button>
                      <button
                        onClick={() => setEditItem({ ...kr })}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Edit Data"
                      >
                        <Edit size={12} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteItem(kr)}
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

      {/* MODAL: ADD ASESMEN KARIR */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Compass size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Formulir Asesmen Karir Siswa</h3>
                  <p className="text-xs text-slate-500 font-medium">Pemetaan potensi bakat, minat profesi & rekomendasi kelanjutan studi</p>
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tipe Kepribadian & Potensi Dominan</label>
                <input
                  type="text"
                  value={formData.tipeKepribadian || ''}
                  onChange={(e) => setFormData({ ...formData, tipeKepribadian: e.target.value })}
                  placeholder="Contoh: Investigatif & Logika-Matematis / Artistik & Kreatif"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Minat & Bakat Utama</label>
                  <input
                    type="text"
                    value={formData.minatBakat || ''}
                    onChange={(e) => setFormData({ ...formData, minatBakat: e.target.value })}
                    placeholder="Contoh: Desain Visual, Robotik, Public Speaking"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Target Cita-cita / Profesi</label>
                  <input
                    type="text"
                    value={formData.citaCita || ''}
                    onChange={(e) => setFormData({ ...formData, citaCita: e.target.value })}
                    required
                    placeholder="Contoh: Dokter Spesialis, Software Engineer, Arsitek"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Rekomendasi Jurusan / Peminatan</label>
                  <input
                    type="text"
                    value={formData.rekomendasiStudi || ''}
                    onChange={(e) => setFormData({ ...formData, rekomendasiStudi: e.target.value })}
                    placeholder="Contoh: S1 Teknik Informatika / SMK Jurusan RPL"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Rekomendasi Kampus / Sekolah Lanjutan</label>
                  <input
                    type="text"
                    value={formData.rekomendasiKampusKarir || ''}
                    onChange={(e) => setFormData({ ...formData, rekomendasiKampusKarir: e.target.value })}
                    placeholder="Contoh: ITB / UI / SMKN 1 Unggulan"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Catatan Konselor & Rekomendasi Khusus</label>
                <textarea
                  value={formData.catatanKonselor || ''}
                  onChange={(e) => setFormData({ ...formData, catatanKonselor: e.target.value })}
                  rows={2}
                  placeholder="Catatan konselor mengenai mata pelajaran pendukung, sertifikasi, atau bimbingan orang tua..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status Pemetaan</label>
                <select
                  value={formData.status || 'TERPETAKAN'}
                  onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="TERPETAKAN">Terpetakan</option>
                  <option value="KONSULTASI LANJUTAN">Konsultasi Lanjutan</option>
                  <option value="PERSIAPAN DAFTAR">Persiapan Daftar</option>
                  <option value="SELESAI REKOMENDASI">Selesai Rekomendasi</option>
                </select>
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Asesmen Karir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DETAIL & PRINT REKOMENDASI */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Lembar Rekomendasi Karir & Studi</h3>
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
                  <span className="text-slate-400 text-[10px] font-black uppercase">Tipe Kepribadian</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{viewDetail.tipeKepribadian}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-black uppercase">Minat & Bakat</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{viewDetail.minatBakat}</div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                <span className="text-blue-700 text-[10px] font-black uppercase">Target Karir & Rekomendasi Jurusan</span>
                <div className="text-sm font-black text-slate-900">{viewDetail.citaCita}</div>
                <div className="text-xs font-bold text-blue-900">{viewDetail.rekomendasiStudi} • {viewDetail.rekomendasiKampusKarir}</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] font-black uppercase">Catatan & Saran Guru Pembimbing</span>
                <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium">
                  {viewDetail.catatanKonselor}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-500">Status Pemetaan: <strong>{viewDetail.status}</strong></span>
                <span className="text-slate-400 font-mono">Tgl: {viewDetail.tanggal}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak Lembar Rekomendasi</span>
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
                <h3 className="text-base font-black text-slate-900">Edit Asesmen: {editItem.namaSiswa}</h3>
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
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Target Cita-cita</label>
                <input
                  type="text"
                  value={editItem.citaCita || ''}
                  onChange={(e) => setEditItem({ ...editItem, citaCita: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Rekomendasi Studi</label>
                  <input
                    type="text"
                    value={editItem.rekomendasiStudi || ''}
                    onChange={(e) => setEditItem({ ...editItem, rekomendasiStudi: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status Pemetaan</label>
                  <select
                    value={editItem.status || 'TERPETAKAN'}
                    onChange={(e: any) => setEditItem({ ...editItem, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    <option value="TERPETAKAN">Terpetakan</option>
                    <option value="KONSULTASI LANJUTAN">Konsultasi Lanjutan</option>
                    <option value="PERSIAPAN DAFTAR">Persiapan Daftar</option>
                    <option value="SELESAI REKOMENDASI">Selesai Rekomendasi</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Catatan Konselor</label>
                <textarea
                  value={editItem.catatanKonselor || ''}
                  onChange={(e) => setEditItem({ ...editItem, catatanKonselor: e.target.value })}
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
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
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Trash2 size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Hapus Asesmen Karir</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data asesmen <strong className="text-slate-800">"{deleteItem.id} - {deleteItem.namaSiswa}"</strong>?
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
