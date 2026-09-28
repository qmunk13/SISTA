import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, Plus, Search, Filter, Trash2, Edit3, CheckCircle2, 
  Calendar, Clock, MapPin, Award, UserCheck, Star, ShieldCheck, 
  Sparkles, X, ChevronRight, FileText, Download
} from 'lucide-react';
import { useStore } from '../store';
import { EkskulItem, EkskulMember } from '../types';
import { INITIAL_EKSKUL, INITIAL_MEMBERS } from '../data/ekskulSeed';
import { db } from '../data/db';
import { exportToExcel } from '../lib/excel';

export default function EkskulPage() {
  const { students, teachers, settings } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'daftar-ekskul' | 'anggota' | 'penilaian-rapor'>('daftar-ekskul');

  const [ekskulList, setEkskulList] = useState<EkskulItem[]>(() => {
    const saved = db.get<EkskulItem>('ekskul_list');
    return (saved && saved.length > 0) ? saved : INITIAL_EKSKUL;
  });

  const [members, setMembers] = useState<EkskulMember[]>(() => {
    const saved = db.get<EkskulMember>('ekskul_members');
    return (saved && saved.length > 0) ? saved : INITIAL_MEMBERS;
  });

  useEffect(() => {
    db.set('ekskul_list', ekskulList);
  }, [ekskulList]);

  useEffect(() => {
    db.set('ekskul_members', members);
  }, [members]);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEkskulFilter, setSelectedEkskulFilter] = useState('Semua');

  // Modals
  const [isEkskulModalOpen, setIsEkskulModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingEkskul, setEditingEkskul] = useState<EkskulItem | null>(null);

  // Forms
  const [ekskulForm, setEkskulForm] = useState<Partial<EkskulItem>>({
    kodeEkskul: '',
    nama: '',
    kategori: 'Pilihan',
    namaPembina: '',
    hariLatihan: 'Jumat',
    waktuLatihan: '15.00 - 17.00 WIB',
    tempatLatihan: 'Lapangan Sekolah',
    kuota: 30,
    deskripsi: '',
    status: 'Aktif',
  });

  const [memberForm, setMemberForm] = useState({
    ekskulId: '',
    studentId: '',
    jabatan: 'Anggota' as const,
    nilai: 'A' as const,
    keterangan: 'Aktif mengikuti kegiatan',
  });

  // Handle Save Ekskul
  const handleSaveEkskul = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ekskulForm.nama) {
      alert('Nama Ekstrakurikuler wajib diisi!');
      return;
    }

    if (editingEkskul) {
      setEkskulList(prev => prev.map(item => item.id === editingEkskul.id ? { ...item, ...ekskulForm } as EkskulItem : item));
      alert('Data Ekstrakurikuler berhasil diperbarui!');
    } else {
      const newItem: EkskulItem = {
        id: `EKS-${Date.now().toString().slice(-4)}`,
        kodeEkskul: ekskulForm.kodeEkskul || `EKS-${Date.now().toString().slice(-3)}`,
        nama: ekskulForm.nama || '',
        kategori: (ekskulForm.kategori as any) || 'Pilihan',
        namaPembina: ekskulForm.namaPembina || 'Guru Pembina',
        hariLatihan: ekskulForm.hariLatihan || 'Jumat',
        waktuLatihan: ekskulForm.waktuLatihan || '15.00 - 17.00 WIB',
        tempatLatihan: ekskulForm.tempatLatihan || 'Sekolah',
        kuota: Number(ekskulForm.kuota) || 30,
        deskripsi: ekskulForm.deskripsi || '',
        status: 'Aktif',
      };
      setEkskulList(prev => [...prev, newItem]);
      alert('Ekstrakurikuler baru berhasil ditambahkan!');
    }

    setIsEkskulModalOpen(false);
    setEditingEkskul(null);
  };

  // Handle Add Member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.ekskulId || !memberForm.studentId) {
      alert('Mohon pilih Ekstrakurikuler dan Nama Siswa!');
      return;
    }

    const ekskulObj = ekskulList.find(e => e.id === memberForm.ekskulId);
    const studentObj = students.find(s => s.id === memberForm.studentId);

    if (!ekskulObj || !studentObj) return;

    // Check duplicate
    const isAlreadyMember = members.some(m => m.ekskulId === memberForm.ekskulId && m.studentId === memberForm.studentId);
    if (isAlreadyMember) {
      alert('Siswa ini sudah terdaftar dalam ekstrakurikuler yang sama!');
      return;
    }

    const newMember: EkskulMember = {
      id: `MBR-${Date.now().toString().slice(-4)}`,
      ekskulId: ekskulObj.id,
      namaEkskul: ekskulObj.nama,
      studentId: studentObj.id,
      nis: studentObj.nis || studentObj.nisn || '-',
      namaSiswa: studentObj.name,
      kelas: studentObj.class || (studentObj as any).kelas || 'Siswa',
      jabatan: memberForm.jabatan,
      tanggalGabung: new Date().toISOString().split('T')[0],
      nilai: memberForm.nilai,
      keterangan: memberForm.keterangan,
    };

    setMembers(prev => [newMember, ...prev]);
    alert(`Siswa "${studentObj.name}" berhasil didaftarkan ke ekskul "${ekskulObj.nama}"!`);
    setIsMemberModalOpen(false);
  };

  // Handle Update Nilai Rapor
  const handleUpdateNilai = (memberId: string, nilai: string, keterangan: string) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, nilai, keterangan } : m));
  };

  const handleExportEkskul = () => {
    const rows = members.map((m, idx) => ({
      'No': idx + 1,
      'Nama Ekstrakurikuler': m.namaEkskul,
      'NIS/NISN': m.nis,
      'Nama Siswa': m.namaSiswa,
      'Kelas': m.kelas,
      'Jabatan': m.jabatan,
      'Tanggal Bergabung': m.tanggalGabung,
      'Nilai Rapor': m.nilai,
      'Deskripsi Capaian / Keterangan': m.keterangan
    }));
    exportToExcel(rows, `Data_Ekstrakurikuler_Anggota_${new Date().toISOString().slice(0, 10)}.xlsx`, 'EKSKUL_DAN_ANGGOTA');
  };

  const filteredEkskul = ekskulList.filter(e => {
    const matchSearch = (e.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (e.namaPembina || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const filteredMembers = members.filter(m => {
    const matchEkskul = selectedEkskulFilter === 'Semua' || m.ekskulId === selectedEkskulFilter;
    const matchSearch = (m.namaSiswa || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (m.namaEkskul || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (m.kelas || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchEkskul && matchSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-xs">
              <Trophy size={24} className="text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-white/10 rounded-full border border-white/20">
              Pengembangan Bakat & Minat
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Ekstrakurikuler & Organisasi (OSIS)</h1>
          <p className="text-amber-100 text-xs sm:text-sm">
            Manajemen cabang ekstrakurikuler, pembina, keanggotaan siswa, jadwal latihan, dan rekap nilai rapor kurikulum merdeka
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportEkskul}
            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-2xl backdrop-blur-xs border border-white/20 shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <Download size={16} />
            <span>Ekspor Ekskul & Rapor (.xlsx)</span>
          </button>
          <button
            onClick={() => setIsMemberModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <UserCheck size={16} />
            <span>Daftarkan Anggota Siswa</span>
          </button>
          <button
            onClick={() => {
              setEditingEkskul(null);
              setEkskulForm({
                kodeEkskul: `EKS-${Date.now().toString().slice(-3)}`,
                nama: '',
                kategori: 'Pilihan',
                namaPembina: '',
                hariLatihan: 'Jumat',
                waktuLatihan: '15.00 - 17.00 WIB',
                tempatLatihan: 'Lapangan Sekolah',
                kuota: 30,
                deskripsi: '',
                status: 'Aktif',
              });
              setIsEkskulModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white text-orange-950 hover:bg-orange-50 font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Cabang Ekskul</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cabang Ekskul</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{ekskulList.length}</p>
          <span className="text-[10px] text-slate-500 font-medium">Organisasi & Peminatan</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Anggota</span>
          <p className="text-2xl sm:text-3xl font-black text-orange-600">{members.length}</p>
          <span className="text-[10px] text-slate-500 font-medium">Siswa Terdaftar Aktif</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ekskul Wajib</span>
          <p className="text-2xl sm:text-3xl font-black text-indigo-700">
            {ekskulList.filter(e => e.kategori === 'Wajib').length}
          </p>
          <span className="text-[10px] text-indigo-600 font-medium">Kepanduan Pramuka</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nilai Rapor Terisi</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">
            {members.filter(m => !!m.nilai).length} / {members.length}
          </p>
          <span className="text-[10px] text-emerald-700 font-medium">Siap Cetak Rapor</span>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl gap-1 max-w-xl">
        <button
          onClick={() => setActiveSubTab('daftar-ekskul')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'daftar-ekskul' ? 'bg-white text-orange-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trophy size={14} />
          <span>Cabang Ekskul ({ekskulList.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('anggota')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'anggota' ? 'bg-white text-orange-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={14} />
          <span>Daftar Anggota ({members.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('penilaian-rapor')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'penilaian-rapor' ? 'bg-white text-orange-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award size={14} />
          <span>Penilaian Rapor</span>
        </button>
      </div>

      {/* SUBTAB 1: DAFTAR CABANG EKSKUL */}
      {activeSubTab === 'daftar-ekskul' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEkskul.map((ekskul) => {
              const memberCount = members.filter(m => m.ekskulId === ekskul.id).length;
              return (
                <div key={ekskul.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-orange-50 text-orange-700 border border-orange-200">
                        {ekskul.kategori}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-400">{ekskul.kodeEkskul}</span>
                    </div>

                    <h3 className="font-black text-base text-slate-900 leading-snug">{ekskul.nama}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{ekskul.deskripsi || 'Tidak ada deskripsi'}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Users size={14} className="text-orange-600" />
                      <span className="font-semibold">{ekskul.namaPembina}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{ekskul.hariLatihan} • {ekskul.waktuLatihan}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                      <MapPin size={13} className="text-slate-400" />
                      <span>{ekskul.tempatLatihan}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700">
                      {memberCount} Anggota Terdaftar
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingEkskul(ekskul);
                          setEkskulForm(ekskul);
                          setIsEkskulModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus cabang ekskul "${ekskul.nama}"?`)) {
                            setEkskulList(prev => prev.filter(e => e.id !== ekskul.id));
                            setMembers(prev => prev.filter(m => m.ekskulId !== ekskul.id));
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: DAFTAR ANGGOTA */}
      {activeSubTab === 'anggota' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa, ekskul, kelas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedEkskulFilter}
                onChange={e => setSelectedEkskulFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="Semua">Semua Ekskul ({members.length} Siswa)</option>
                {ekskulList.map(e => (
                  <option key={e.id} value={e.id}>{e.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 pl-4">No</th>
                  <th className="p-3">Nama Siswa & NIS</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Ekstrakurikuler</th>
                  <th className="p-3">Jabatan</th>
                  <th className="p-3">Tgl Bergabung</th>
                  <th className="p-3 pr-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 pl-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{m.namaSiswa}</p>
                      <span className="text-[10px] font-mono text-slate-400">NIS: {m.nis}</span>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{m.kelas}</td>
                    <td className="p-3 font-bold text-orange-950">{m.namaEkskul}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-800">
                        {m.jabatan}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{m.tanggalGabung}</td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Hapus ${m.namaSiswa} dari ${m.namaEkskul}?`)) {
                            setMembers(prev => prev.filter(item => item.id !== m.id));
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: PENILAIAN RAPOR */}
      {activeSubTab === 'penilaian-rapor' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-base text-slate-900">Rekapitulasi Nilai Ekstrakurikuler Rapor</h3>
            <p className="text-xs text-slate-500">Predikat dan deskripsi capaian yang otomatis ditarik ke dalam Lembar Rapor Siswa Kurikulum Merdeka</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 pl-4">Nama Siswa & Rombel</th>
                  <th className="p-3">Ekskul</th>
                  <th className="p-3 w-28">Predikat Nilai</th>
                  <th className="p-3 pr-4">Catatan Perkembangan / Deskripsi Pembina</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 pl-4">
                      <p className="font-bold text-slate-900">{m.namaSiswa}</p>
                      <span className="text-[10px] text-slate-500">{m.kelas}</span>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{m.namaEkskul}</td>
                    <td className="p-3">
                      <select
                        value={m.nilai || 'A'}
                        onChange={(e) => handleUpdateNilai(m.id, e.target.value as any, m.keterangan || '')}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-indigo-900 focus:outline-none"
                      >
                        <option value="A">A (Sangat Baik)</option>
                        <option value="B">B (Baik)</option>
                        <option value="C">C (Cukup)</option>
                        <option value="D">D (Kurang)</option>
                      </select>
                    </td>
                    <td className="p-3 pr-4">
                      <input
                        type="text"
                        value={m.keterangan || ''}
                        onChange={(e) => handleUpdateNilai(m.id, m.nilai || 'A', e.target.value)}
                        placeholder="Contoh: Sangat aktif memimpin latihan baris berbaris..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH EKSKUL */}
      {isEkskulModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-900">Tambah Cabang Ekstrakurikuler</h3>
              <button onClick={() => setIsEkskulModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEkskul} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Nama Ekstrakurikuler *</label>
                <input
                  type="text"
                  required
                  value={ekskulForm.nama}
                  onChange={e => setEkskulForm({ ...ekskulForm, nama: e.target.value })}
                  placeholder="Contoh: Seni Musik & Drumband"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Kategori</label>
                  <select
                    value={ekskulForm.kategori}
                    onChange={e => setEkskulForm({ ...ekskulForm, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Wajib">Wajib (Pramuka)</option>
                    <option value="Pilihan">Pilihan Umum</option>
                    <option value="Keolahragaan">Keolahragaan</option>
                    <option value="Kesenian & Budaya">Kesenian & Budaya</option>
                    <option value="Keagamaan">Keagamaan</option>
                    <option value="Sains & Teknologi">Sains & Teknologi</option>
                    <option value="Kepemimpinan/OSIS">Kepemimpinan/OSIS</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Nama Guru Pembina</label>
                  <select
                    value={ekskulForm.namaPembina}
                    onChange={e => setEkskulForm({ ...ekskulForm, namaPembina: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">-- Pilih Guru Pembina --</option>
                    {teachers.map((t, idx) => (
                      <option key={t.id ? `opt-pembina-${t.id}-${idx}` : `opt-pembina-${idx}`} value={t.name}>{t.name} ({t.subject || 'GTK'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Hari Latihan</label>
                  <input
                    type="text"
                    value={ekskulForm.hariLatihan}
                    onChange={e => setEkskulForm({ ...ekskulForm, hariLatihan: e.target.value })}
                    placeholder="Jumat"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Waktu</label>
                  <input
                    type="text"
                    value={ekskulForm.waktuLatihan}
                    onChange={e => setEkskulForm({ ...ekskulForm, waktuLatihan: e.target.value })}
                    placeholder="15.00 - 17.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Tempat</label>
                  <input
                    type="text"
                    value={ekskulForm.tempatLatihan}
                    onChange={e => setEkskulForm({ ...ekskulForm, tempatLatihan: e.target.value })}
                    placeholder="Lapangan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEkskulModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-lg"
                >
                  Simpan Ekskul
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DAFTAR ANGGOTA */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-900">Daftarkan Anggota Siswa ke Ekskul</h3>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Pilih Ekstrakurikuler *</label>
                <select
                  required
                  value={memberForm.ekskulId}
                  onChange={e => setMemberForm({ ...memberForm, ekskulId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="">-- Pilih Cabang Ekskul --</option>
                  {ekskulList.map(e => (
                    <option key={e.id} value={e.id}>{e.nama} ({e.hariLatihan})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Pilih Siswa *</label>
                <select
                  required
                  value={memberForm.studentId}
                  onChange={e => setMemberForm({ ...memberForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="">-- Pilih Siswa ({students.length} Siswa) --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} • Kelas {s.class || (s as any).kelas || '-'} - NIS: {s.nis || s.nisn || '-'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Jabatan di Ekskul</label>
                  <select
                    value={memberForm.jabatan}
                    onChange={e => setMemberForm({ ...memberForm, jabatan: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Ketua">Ketua</option>
                    <option value="Wakil Ketua">Wakil Ketua</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Anggota">Anggota</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Predikat Nilai Awal</label>
                  <select
                    value={memberForm.nilai}
                    onChange={e => setMemberForm({ ...memberForm, nilai: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="A">A (Sangat Baik)</option>
                    <option value="B">B (Baik)</option>
                    <option value="C">C (Cukup)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
