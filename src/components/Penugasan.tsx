import React, { useState, useEffect } from 'react';
import { db } from '../data/db';
import { Tugas, HasilTugas } from '../types';
import { useSubTab } from '../utils/subTabHelper';
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  Clock,
  BookOpen,
  CheckCircle,
  FileCheck,
  Award,
  AlertCircle,
  Send,
  Trash2,
  Edit3
} from 'lucide-react';

declare const Swal: any;

interface PenugasanProps {
  user: any;
}

export default function Penugasan({ user }: PenugasanProps) {
  const [activeSubTab, setActiveSubTab] = useSubTab<'dashboard' | 'daftar' | 'hasil'>('penugasan', 'daftar');
  const [tugasList, setTugasList] = useState<Tugas[]>([]);
  const [hasilList, setHasilList] = useState<HasilTugas[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Active task details for taking/submitting task
  const [activeTugas, setActiveTugas] = useState<Tugas | null>(null);
  const [jawabanEsai, setJawabanEsai] = useState('');

  // Form state for creating/editing tugas (Teacher mode)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTugas, setEditingTugas] = useState<Tugas | null>(null);
  const [formMapel, setFormMapel] = useState('');
  const [formJudul, setFormJudul] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formKelas, setFormKelas] = useState('Semua');
  const [formTglMulai, setFormTglMulai] = useState('');
  const [formTglSelesai, setFormTglSelesai] = useState('');
  const [formDurasi, setFormDurasi] = useState(60);

  const siswaList = db.get<any>('siswa');
  const kelasList = db.get<any>('kelas') || [];
  const studentUser = siswaList.find((s: any) => s.nisn === user.username || s.id === `SIS_${user.username}` || s.nama === user.name);

  // Filter tasks based on student class and check if already completed
  const filteredTugasList = user.role === 'SISWA' && studentUser
    ? tugasList.filter((tg) => {
        const matchesClass = tg.kelas === studentUser.kelasId || 
                             tg.kelas === 'Semua' ||
                             (tg.kelas === '12' && studentUser.kelasId === 'C12') ||
                             (tg.kelas === '11' && studentUser.kelasId === 'C11') ||
                             (tg.kelas === '10' && studentUser.kelasId === 'C10');
        if (!matchesClass) return false;
        const isCompleted = hasilList.some((h) => 
          h.idTugas === tg.idTugas && (h.nisn === studentUser.nisn || h.namaSiswa === user.name)
        );
        return !isCompleted;
      })
    : tugasList;

  useEffect(() => {
    if (user.role === 'SISWA' && activeSubTab !== 'daftar') {
      setActiveSubTab('daftar');
    }
  }, [user.role, activeSubTab]);

  useEffect(() => {
    loadAllData();
  }, [activeSubTab]);

  const loadAllData = () => {
    setTugasList(db.get<Tugas>('tugas') || []);
    setHasilList(db.get<HasilTugas>('hasil_tugas') || []);
  };

  const handleStartTugas = (tg: Tugas) => {
    Swal.fire({
      title: 'Mulai Kerjakan Tugas?',
      text: `Anda akan mengerjakan tugas ${tg.judul} (${tg.mapel}).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Mulai Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3b82f6',
    }).then((res) => {
      if (res.isConfirmed) {
        setActiveTugas(tg);
        setJawabanEsai('');
      }
    });
  };

  const handleSubmitTugas = () => {
    if (!activeTugas) return;
    if (!jawabanEsai.trim()) {
      Swal.fire('Perhatian', 'Harap isi jawaban Anda terlebih dahulu.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Mengirim Tugas...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    setTimeout(() => {
      Swal.close();

      const newHasil: HasilTugas = {
        id: `HST_${Date.now().toString().slice(-4)}`,
        idTugas: activeTugas.idTugas,
        mapel: activeTugas.mapel,
        kelas: activeTugas.kelas,
        nisn: studentUser?.nisn || user.username || '2024001',
        namaSiswa: user.name,
        nilaiAkhir: 0,
        jawabanEsai: jawabanEsai,
        status: 'SUBMITTED',
        tanggal: new Date().toISOString().slice(0, 10)
      };

      const updatedHasil = [...db.get<HasilTugas>('hasil_tugas') || [], newHasil];
      db.set('hasil_tugas', updatedHasil);

      Swal.fire({
        icon: 'success',
        title: 'Tugas Berhasil Dikirim!',
        text: 'Tugas Anda telah disimpan dan menunggu penilaian dari guru.',
        confirmButtonText: 'Kembali',
        confirmButtonColor: '#10b981'
      });

      setActiveTugas(null);
      loadAllData();
    }, 1200);
  };

  const handleSaveTugasForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMapel || !formJudul || !formDeskripsi) {
      Swal.fire('Error', 'Harap lengkapi seluruh field formulir.', 'error');
      return;
    }

    const currentList = db.get<Tugas>('tugas') || [];

    if (editingTugas) {
      // Edit
      const updated = currentList.map(t => t.idTugas === editingTugas.idTugas ? {
        ...t,
        mapel: formMapel,
        judul: formJudul,
        deskripsi: formDeskripsi,
        kelas: formKelas,
        tanggalMulai: formTglMulai || new Date().toISOString().slice(0, 10),
        tanggalSelesai: formTglSelesai || new Date().toISOString().slice(0, 10),
        durasi: Number(formDurasi)
      } : t);
      db.set('tugas', updated);
      Swal.fire('Berhasil', 'Tugas berhasil diperbarui.', 'success');
    } else {
      // Add
      const newTugas: Tugas = {
        idTugas: `TGS-${Date.now().toString().slice(-3)}`,
        mapel: formMapel,
        judul: formJudul,
        deskripsi: formDeskripsi,
        kelas: formKelas,
        tanggalMulai: formTglMulai || new Date().toISOString().slice(0, 10),
        tanggalSelesai: formTglSelesai || new Date().toISOString().slice(0, 10),
        durasi: Number(formDurasi),
        tahunAjaran: '2026/2027'
      };
      db.set('tugas', [...currentList, newTugas]);
      Swal.fire('Berhasil', 'Tugas baru berhasil diterbitkan.', 'success');
    }

    setIsFormOpen(false);
    setEditingTugas(null);
    clearForm();
    loadAllData();
  };

  const clearForm = () => {
    setFormMapel('');
    setFormJudul('');
    setFormDeskripsi('');
    setFormKelas('Semua');
    setFormTglMulai('');
    setFormTglSelesai('');
    setFormDurasi(60);
  };

  const handleEditTugas = (tg: Tugas) => {
    setEditingTugas(tg);
    setFormMapel(tg.mapel);
    setFormJudul(tg.judul);
    setFormDeskripsi(tg.deskripsi);
    setFormKelas(tg.kelas);
    setFormTglMulai(tg.tanggalMulai);
    setFormTglSelesai(tg.tanggalSelesai);
    setFormDurasi(tg.durasi);
    setIsFormOpen(true);
  };

  const handleDeleteTugas = (id: string) => {
    Swal.fire({
      title: 'Hapus Tugas?',
      text: 'Tugas yang dihapus tidak dapat dipulihkan beserta riwayat pengumpulannya.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    }).then(res => {
      if (res.isConfirmed) {
        const updated = tugasList.filter(t => t.idTugas !== id);
        db.set('tugas', updated);
        Swal.fire('Terhapus', 'Tugas berhasil dihapus.', 'success');
        loadAllData();
      }
    });
  };

  const handleBeriNilai = (hs: HasilTugas) => {
    Swal.fire({
      title: 'Beri Nilai Formatif (Tugas)',
      html: `
        <div class="text-left space-y-3">
          <div class="flex items-center gap-2">
            <span class="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">Kategori: FORMATIF</span>
            <span class="text-xs text-slate-500">Mapel: <b>${hs.mapel || '-'}</b></span>
          </div>
          <p class="text-xs text-slate-600">Siswa: <b>${hs.namaSiswa}</b> (${hs.nisn || hs.nopdkt || '-'})</p>
          <div class="p-3 bg-slate-50 rounded-xl border text-xs max-h-32 overflow-y-auto">
            ${hs.jawabanEsai || 'Tidak ada teks esai.'}
          </div>
          <div>
            <label class="text-xs font-bold block mb-1">Skor Nilai Formatif (0 - 100):</label>
            <input type="number" id="swal-score" class="w-full border rounded-xl p-2 text-sm text-center font-bold focus:ring-2 focus:ring-blue-500" min="0" max="100" value="${hs.nilaiAkhir || ''}">
            <p class="text-[10px] text-slate-400 mt-1">*Nilai ini otomatis tercatat sebagai <b>Nilai Formatif (Tugas)</b> dalam Buku Penilaian Akademik.</p>
          </div>
          <div>
            <label class="text-xs font-bold block mb-1">Catatan / Umpan Balik Guru:</label>
            <textarea id="swal-feedback" class="w-full border rounded-xl p-2 text-xs focus:ring-2 focus:ring-blue-500" rows="3" placeholder="Contoh: Sangat baik, analisis tajam...">${hs.catatanGuru || ''}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan Nilai Formatif',
      confirmButtonColor: '#3b82f6',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const scoreVal = (document.getElementById('swal-score') as HTMLInputElement).value;
        const feedbackVal = (document.getElementById('swal-feedback') as HTMLTextAreaElement).value;
        if (!scoreVal || isNaN(Number(scoreVal)) || Number(scoreVal) < 0 || Number(scoreVal) > 100) {
          Swal.showValidationMessage('Harap masukkan nilai valid antara 0 dan 100.');
          return false;
        }
        return { score: Number(scoreVal), feedback: feedbackVal };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        const { score, feedback } = res.value;
        const updated = hasilList.map(h => h.id === hs.id ? {
          ...h,
          nilaiAkhir: score,
          kategoriNilai: 'FORMATIF',
          catatanGuru: feedback,
          status: 'TERDINILAI' as const
        } : h);
        db.set('hasil_tugas', updated);
        Swal.fire({
          icon: 'success',
          title: 'Nilai Formatif Disimpan!',
          text: `Nilai tugas ${score} berhasil dicatat sebagai Nilai Formatif dan tersinkronisasi ke Buku Penilaian.`,
          confirmButtonColor: '#3b82f6'
        });
        loadAllData();
      }
    });
  };

  // Student is currently taking the assignment
  if (activeTugas) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
          <div className="space-y-1">
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-100">
              {activeTugas.mapel}
            </span>
            <h2 className="text-xl font-extrabold text-slate-800 leading-tight">{activeTugas.judul}</h2>
            <p className="text-xs text-slate-400">Kelas {activeTugas.kelas} | Selesaikan esai dengan saksama.</p>
          </div>
          <button 
            onClick={() => {
              Swal.fire({
                title: 'Batalkan Pengisian?',
                text: 'Draft jawaban Anda akan hilang.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'Ya, Keluar'
              }).then(r => {
                if (r.isConfirmed) setActiveTugas(null);
              });
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition"
          >
            Kembali
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm md:col-span-1 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide border-b pb-2">Instruksi Tugas</h3>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed bg-slate-50 p-4 rounded-2xl border">
              <p className="font-bold text-slate-800">Soal/Deskripsi:</p>
              <p className="italic">{activeTugas.deskripsi}</p>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Batas Akhir: <b>{activeTugas.tanggalSelesai}</b></span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm md:col-span-2 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide border-b pb-2">Lembar Jawaban Esai</h3>
            <textarea
              value={jawabanEsai}
              onChange={(e) => setJawabanEsai(e.target.value)}
              className="w-full border rounded-2xl p-4 text-xs focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed min-h-[300px]"
              placeholder="Ketikkan laporan / jawaban esai Anda di sini dengan lengkap..."
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-bold">
                Jumlah karakter: {jawabanEsai.length}
              </span>
              <button
                onClick={handleSubmitTugas}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition"
              >
                <Send className="w-4 h-4" /> Kirim Jawaban Tugas
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Sistem Penugasan Siswa</h2>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Nilai Formatif
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Penugasan esai, latihan soal harian, dan capaian Tujuan Pembelajaran (TP) yang dihitung sebagai <b>Nilai Formatif</b>.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.role !== 'SISWA' && (
            <button
              onClick={() => {
                setEditingTugas(null);
                clearForm();
                setIsFormOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Terbitkan Tugas Baru
            </button>
          )}
          <button onClick={loadAllData} className="p-2.5 bg-slate-50 hover:bg-slate-100 border rounded-xl text-slate-400 hover:text-slate-600 transition" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
        {[
          { id: 'dashboard', label: 'Dashboard Tugas', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'] },
          { id: 'daftar', label: 'Daftar Tugas', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS', 'SISWA'] },
          { id: 'hasil', label: 'Hasil Pengumpulan', roles: ['SUPERADMIN', 'ADMIN', 'GURU', 'WALI_KELAS'] }
        ].filter(tab => !tab.roles || tab.roles.includes(user.role)).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
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

      {/* 1. DASHBOARD SUBTAB */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Total Tugas Terbit</span>
              <h4 className="text-xl font-black text-blue-600 mt-1">{tugasList.length}</h4>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Tugas Dikumpulkan</span>
              <h4 className="text-xl font-black text-emerald-600 mt-1">{hasilList.length}</h4>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Menunggu Penilaian</span>
              <h4 className="text-xl font-black text-amber-500 mt-1">
                {hasilList.filter(h => h.status === 'SUBMITTED').length}
              </h4>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Telah Dinilai</span>
              <h4 className="text-xl font-black text-indigo-600 mt-1">
                {hasilList.filter(h => h.status === 'TERDINILAI').length}
              </h4>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide border-b pb-3">Ringkasan Penilaian Guru</h3>
            {hasilList.filter(h => h.status === 'TERDINILAI').length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest">
                KOSONG
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] font-black text-slate-400 uppercase">
                      <th className="p-3">Siswa</th>
                      <th className="p-3">Mata Pelajaran</th>
                      <th className="p-3">Tanggal Dinilai</th>
                      <th className="p-3 text-center">Nilai</th>
                      <th className="p-3">Catatan Guru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-slate-600">
                    {hasilList.filter(h => h.status === 'TERDINILAI').map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-800">{h.namaSiswa}</td>
                        <td className="p-3">{h.mapel}</td>
                        <td className="p-3">{h.tanggal}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-lg font-black text-sm">
                            {h.nilaiAkhir}
                          </span>
                        </td>
                        <td className="p-3 italic text-slate-500">{h.catatanGuru || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. DAFTAR TUGAS SUBTAB */}
      {activeSubTab === 'daftar' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm flex justify-between items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Mata Pelajaran atau Judul Tugas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>

          {filteredTugasList.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm font-extrabold text-slate-400 text-xs uppercase tracking-widest">
              KOSONG
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTugasList
                .filter(t => t.mapel.toLowerCase().includes(searchQuery.toLowerCase()) || t.judul.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((tg) => (
                  <div key={tg.idTugas} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 border border-blue-100 rounded-full text-[10px] font-black uppercase">
                          {tg.mapel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          Kelas {tg.kelas}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-sm line-clamp-1 leading-snug">{tg.judul}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{tg.deskripsi}</p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">BATAS PENGUMPULAN</span>
                        <div className="flex items-center gap-1 text-rose-500 font-extrabold text-[10px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{tg.tanggalSelesai}</span>
                        </div>
                      </div>

                      {user.role === 'SISWA' ? (
                        <button
                          onClick={() => handleStartTugas(tg)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl text-[11px] transition shadow-sm"
                        >
                          Kerjakan
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditTugas(tg)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTugas(tg.idTugas)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 3. HASIL PENGUMPULAN SUBTAB (TEACHER/ADMIN ONLY) */}
      {activeSubTab === 'hasil' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide border-b pb-3">Daftar Pengumpulan Tugas Siswa</h3>
          {hasilList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest">
              KOSONG
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-[10px] font-black text-slate-400 uppercase">
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">Mata Pelajaran</th>
                    <th className="p-3">Tanggal Kirim</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Nilai</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs text-slate-600">
                  {hasilList.map((hs) => (
                    <tr key={hs.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-800">{hs.namaSiswa}</td>
                      <td className="p-3">{hs.mapel}</td>
                      <td className="p-3">{hs.tanggal}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hs.status === 'TERDINILAI' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {hs.status === 'TERDINILAI' ? 'Telah Dinilai' : 'Menunggu Penilaian'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-black text-slate-800 text-sm">
                        {hs.status === 'TERDINILAI' ? hs.nilaiAkhir : '-'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleBeriNilai(hs)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[11px] transition"
                        >
                          {hs.status === 'TERDINILAI' ? 'Ubah Nilai' : 'Periksa & Nilai'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog Modal for Creation/Edit (Teacher/Admin Mode) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-slate-800 uppercase">
                {editingTugas ? 'Edit Publikasi Tugas' : 'Terbitkan Tugas Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
            </div>

            <form onSubmit={handleSaveTugasForm} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mata Pelajaran:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Fisika, Matematika"
                  value={formMapel}
                  onChange={(e) => setFormMapel(e.target.value)}
                  className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Tugas:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Eksperimen Dinamika Rotasi"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi / Detail Tugas:</label>
                <textarea
                  required
                  placeholder="Tuliskan petunjuk pengerjaan dan detail pertanyaan tugas..."
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kelas Sasaran:</label>
                  <select
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full border rounded-xl p-2.5 outline-none"
                  >
                    <option value="Semua">Semua Kelas</option>
                    {kelasList.map((k: any) => (
                      <option key={k.id} value={k.id}>
                        {k.jenjang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimasi Durasi (Menit):</label>
                  <input
                    type="number"
                    value={formDurasi}
                    onChange={(e) => setFormDurasi(Number(e.target.value))}
                    className="w-full border rounded-xl p-2.5 outline-none"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai:</label>
                  <input
                    type="date"
                    value={formTglMulai}
                    onChange={(e) => setFormTglMulai(e.target.value)}
                    className="w-full border rounded-xl p-2.5 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batas Selesai:</label>
                  <input
                    type="date"
                    value={formTglSelesai}
                    onChange={(e) => setFormTglSelesai(e.target.value)}
                    className="w-full border rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition"
                >
                  Simpan & Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
