import React, { useState, useEffect } from 'react';
import { db } from '../data/db';
import { Bimbingan, Pelanggaran, Siswa, Kelas } from '../types';
import { useSubTab } from '../utils/subTabHelper';
import { 
  Users, 
  Search, 
  RefreshCw, 
  UserX, 
  Plus, 
  FileText, 
  Award, 
  AlertCircle,
  Activity,
  CheckCircle,
  GraduationCap,
  ShieldAlert,
  ThumbsUp,
  HeartHandshake
} from 'lucide-react';

interface BKProps {
  user?: any;
}

export default function BK({ user = { role: 'BK' } }: BKProps) {
  // Dynamic role-filtered subtabs for BK
  const allTabs = [
    { id: 'dashboard', label: 'BK Dashboard', roles: ['SUPERADMIN', 'ADMIN', 'BK'] },
    { id: 'bimbingan', label: 'Konseling Siswa', roles: ['SUPERADMIN', 'ADMIN', 'BK'] },
    { id: 'pelanggaran', label: 'Catatan Pelanggaran', roles: ['SUPERADMIN', 'ADMIN', 'BK'] },
    { id: 'prestasi', label: 'Prestasi Siswa', roles: ['SUPERADMIN', 'ADMIN'] },
    { id: 'karir', label: 'Karir & Rekomendasi', roles: ['SUPERADMIN', 'ADMIN'] }
  ];

  const allowedTabs = allTabs.filter(tab => tab.roles.includes(user.role));

  const [activeSubTab, setActiveSubTab] = useSubTab<string>('bk', 'dashboard');

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(allowedTabs[0].id);
    }
  }, [user.role, activeSubTab]);
  const [bimbinganList, setBimbinganList] = useState<Bimbingan[]>([]);
  const [pelanggaranList, setPelanggaranList] = useState<Pelanggaran[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);

  // Form states for Bimbingan
  const [isBimModalOpen, setIsBimModalOpen] = useState(false);
  const [bimSiswaId, setBimSiswaId] = useState('');
  const [bimJenis, setBimJenis] = useState<Bimbingan['jenis']>('Akademik');
  const [bimTopik, setBimTopik] = useState('');
  const [bimSolusi, setBimSolusi] = useState('');

  // Form states for Pelanggaran
  const [isPelModalOpen, setIsPelModalOpen] = useState(false);
  const [pelSiswaId, setPelSiswaId] = useState('');
  const [pelNama, setPelNama] = useState('');
  const [pelPoin, setPelPoin] = useState(5);
  const [pelCatatan, setPelCatatan] = useState('');

  // Form states for Prestasi
  const [prestasiList, setPrestasiList] = useState<any[]>([
    { id: 'PRS_1', namaSiswa: 'Dewi Lestari', namaPrestasi: 'Juara 1 Olimpiade Astronomi Nasional', kategori: 'Akademik', tanggal: '2026-07-01' },
    { id: 'PRS_2', namaSiswa: 'Citra Kirana', namaPrestasi: 'Juara 2 Debat Bahasa Inggris Tingkat Provinsi', kategori: 'Bahasa', tanggal: '2026-06-25' }
  ]);

  // Interest Profile for Karir
  const [karirSiswa, setKarirSiswa] = useState('S001');
  const [karirMinat, setKarirMinat] = useState('SAINS');

  useEffect(() => {
    loadAllData();
    const handleDbSynced = () => loadAllData();
    window.addEventListener('erp-db-synced', handleDbSynced);
    return () => window.removeEventListener('erp-db-synced', handleDbSynced);
  }, [activeSubTab]);

  const loadAllData = () => {
    setBimbinganList(db.get<Bimbingan>('bimbingan'));
    setPelanggaranList(db.get<Pelanggaran>('pelanggaran'));
    setSiswaList(db.get<Siswa>('siswa').filter(s => s.status === 'AKTIF'));
    setKelasList(db.get<Kelas>('kelas'));
  };

  const getSiswaName = (id: string) => {
    const s = siswaList.find(x => x.id === id);
    return s ? s.nama : id;
  };

  const getKelasName = (id: string) => {
    const k = kelasList.find(x => x.id === id);
    return k ? k.nama : id;
  };

  const handleBimbinganSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bimSiswaId || !bimTopik || !bimSolusi) {
      Swal.fire('Error', 'Harap isi seluruh field wajib.', 'error');
      return;
    }

    const siswa = siswaList.find(x => x.id === bimSiswaId);
    if (!siswa) return;

    const newBim: Bimbingan = {
      id: `BIM_${Date.now().toString().slice(-4)}`,
      siswaId: bimSiswaId,
      kelasId: siswa.kelasId,
      tanggal: new Date().toISOString().slice(0, 10),
      jenis: bimJenis,
      topik: bimTopik,
      solusi: bimSolusi,
      guruWali: 'Pak Bambang BK'
    };

    db.insert<Bimbingan>('bimbingan', newBim);
    Swal.fire('Sukses!', 'Catatan bimbingan siswa berhasil disimpan.', 'success');
    setIsBimModalOpen(false);
    setBimTopik('');
    setBimSolusi('');
    loadAllData();
  };

  const handlePelanggaranSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pelSiswaId || !pelNama) {
      Swal.fire('Error', 'Harap isi seluruh field wajib.', 'error');
      return;
    }

    const siswa = siswaList.find(x => x.id === pelSiswaId);
    if (!siswa) return;

    const newPel: Pelanggaran = {
      id: `PLG_${Date.now().toString().slice(-4)}`,
      siswaId: pelSiswaId,
      kelasId: siswa.kelasId,
      tanggal: new Date().toISOString().slice(0, 10),
      namaPelanggaran: pelNama,
      poin: pelPoin,
      catatan: pelCatatan || 'Dilaporkan oleh Koordinator BK'
    };

    db.insert<Pelanggaran>('pelanggaran', newPel);
    Swal.fire('Sukses!', 'Catatan pelanggaran poin berhasil ditambahkan.', 'success');
    setIsPelModalOpen(false);
    setPelNama('');
    setPelCatatan('');
    loadAllData();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
        {allowedTabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-bk-${tab.id}`}
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

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><UserX className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Poin Pelanggaran</span>
                <h4 className="text-xl font-black text-rose-600 mt-1">
                  {pelanggaranList.reduce((acc, p) => acc + p.poin, 0)} Poin
                </h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><HeartHandshake className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Konseling Selesai</span>
                <h4 className="text-xl font-black text-slate-800 mt-1">{bimbinganList.length} Sesi</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Award className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Siswa Berprestasi</span>
                <h4 className="text-xl font-black text-emerald-600 mt-1">{prestasiList.length} Penghargaan</h4>
              </div>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><GraduationCap className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Rekomendasi Karir</span>
                <h4 className="text-xl font-black text-amber-500 mt-1">Lengkap</h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="bg-white border p-6 rounded-3xl space-y-4">
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-rose-500" /> Peringatan Poin Indisipliner</h4>
              <p className="text-slate-500">Daftar siswa yang mengumpulkan poin pelanggaran mendekati ambang batas pemanggilan wali murid (75 poin).</p>
              <div className="divide-y divide-slate-100">
                {pelanggaranList.slice(0, 5).map((row, idx) => (
                  <div key={idx} className="flex justify-between py-3">
                    <span className="font-bold text-slate-800">{row.siswaId}</span>
                    <span className="font-bold text-rose-600">{row.poin || 0} Poin</span>
                  </div>
                ))}
                {pelanggaranList.length === 0 && (
                  <div className="py-3 text-slate-400 italic">Tidak ada catatan pelanggaran.</div>
                )}
              </div>
            </div>

            <div className="bg-white border p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Layanan Peduli BK</h4>
                <p className="text-slate-400 mt-1">Konseling bimbingan konseling di Sisko melayani pendampingan psikososial, akademik, maupun minat bakat pengembangan karir masa depan.</p>
              </div>
              <button onClick={() => {
                if (siswaList.length > 0) {
                  setBimSiswaId(siswaList[0].id);
                  setIsBimModalOpen(true);
                }
              }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition">
                Buka Sesi Konseling Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'pelanggaran' && (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center flex-wrap gap-4 text-xs">
            <div>
              <h4 className="font-black text-slate-800 text-sm uppercase">Log Pelanggaran Tatatertib Rombel</h4>
            </div>
            <button onClick={() => {
              if (siswaList.length > 0) {
                setPelSiswaId(siswaList[0].id);
                setIsPelModalOpen(true);
              }
            }} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1">
              <Plus className="w-4 h-4" /> Catat Pelanggaran
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Pelanggaran</th>
                  <th className="p-4 text-center">Poin</th>
                  <th className="p-4 text-center hidden sm:table-cell">Tanggal</th>
                  <th className="p-4 hidden md:table-cell">Tindakan Pendisiplinan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pelanggaranList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{getSiswaName(p.siswaId)}</p>
                        <p className="text-[10px] text-slate-400 font-mono sm:hidden mt-0.5">Tgl: {p.tanggal}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-700">{p.namaPelanggaran}</p>
                        {p.tindakan && <p className="text-[10px] text-slate-500 md:hidden mt-0.5">Tindakan: {p.tindakan}</p>}
                      </div>
                    </td>
                    <td className="p-4 text-center font-black text-rose-600">{p.poin}</td>
                    <td className="p-4 text-center font-mono text-slate-500 hidden sm:table-cell">{p.tanggal}</td>
                    <td className="p-4 text-slate-500 font-semibold hidden md:table-cell">{p.tindakan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'bimbingan' && (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center flex-wrap gap-4 text-xs">
            <div>
              <h4 className="font-black text-slate-800 text-sm uppercase">Daftar Jurnal Konseling Siswa</h4>
            </div>
            <button onClick={() => {
              if (siswaList.length > 0) {
                setBimSiswaId(siswaList[0].id);
                setIsBimModalOpen(true);
              }
            }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1">
              <Plus className="w-4 h-4" /> Mulai Bimbingan
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">Siswa</th>
                  <th className="p-4 text-center">Jenis</th>
                  <th className="p-4">Topik Masalah</th>
                  <th className="p-4 text-center hidden sm:table-cell">Tanggal</th>
                  <th className="p-4 hidden md:table-cell">Solusi Rekomendasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bimbinganList.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{getSiswaName(b.siswaId)}</p>
                        <p className="text-[10px] text-slate-400 font-mono sm:hidden mt-0.5">Tgl: {b.tanggal}</p>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-blue-50 text-blue-700 font-black px-2 py-0.5 rounded text-[10px]">{b.jenis}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-slate-700">{b.topik}</p>
                        {b.solusi && <p className="text-[10px] text-slate-500 md:hidden mt-0.5">Solusi: {b.solusi}</p>}
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-500 hidden sm:table-cell">{b.tanggal}</td>
                    <td className="p-4 text-slate-500 font-semibold hidden md:table-cell">{b.solusi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'prestasi' && (
        <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase">Siswa Berprestasi & Penghargaan</h3>
              <p className="text-xs text-slate-400 mt-1">Daftar siswa yang berhasil mendapatkan juara, piala, maupun piagam lomba.</p>
            </div>
            <button onClick={() => {
              Swal.fire({
                title: 'Catat Prestasi Baru',
                html: `
                  <input id="swal-prs-nama" class="swal2-input" placeholder="Nama Siswa">
                  <input id="swal-prs-lomba" class="swal2-input" placeholder="Nama Prestasi / Lomba">
                `,
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                preConfirm: () => {
                  const nama = (document.getElementById('swal-prs-nama') as HTMLInputElement).value;
                  const lomba = (document.getElementById('swal-prs-lomba') as HTMLInputElement).value;
                  if (!nama || !lomba) {
                    Swal.showValidationMessage('Isian wajib dilengkapi!');
                  }
                  return { nama, lomba };
                }
              }).then((result: any) => {
                if (result.isConfirmed) {
                  const newPrs = {
                    id: `PRS_${Date.now()}`,
                    namaSiswa: result.value.nama,
                    namaPrestasi: result.value.lomba,
                    kategori: 'Umum',
                    tanggal: new Date().toISOString().slice(0, 10)
                  };
                  setPrestasiList([newPrs, ...prestasiList]);
                  Swal.fire('Berhasil', 'Catatan prestasi berhasil ditambahkan.', 'success');
                }
              });
            }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow">
              <Plus className="w-4 h-4" /> Tambah Prestasi
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prestasiList.map((p) => (
              <div key={p.id} className="border border-emerald-100 bg-emerald-50/10 rounded-2xl p-5 flex items-start gap-4 hover:border-emerald-500 transition-all">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Award className="w-6 h-6" /></div>
                <div className="text-xs space-y-1">
                  <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] uppercase">{p.kategori}</span>
                  <h4 className="font-bold text-slate-800 text-sm mt-1">{p.namaSiswa}</h4>
                  <p className="text-slate-600 font-semibold leading-relaxed">{p.namaPrestasi}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{p.tanggal}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'karir' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Peta Karir & Rekomendasi Jurusan</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Bantu siswa menentukan rekomendasi program studi universitas berdasarkan profil minat bakat mereka.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="border rounded-2xl p-5 bg-slate-50/50 space-y-4">
              <h5 className="font-bold text-slate-700 text-xs uppercase">Rekomendasi Pintar</h5>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Pilih Minat Utama Siswa</label>
                  <select value={karirMinat} onChange={(e) => setKarirMinat(e.target.value)} className="w-full bg-white border rounded-xl p-2.5 font-bold">
                    <option value="SAINS">Sains, Teknologi & Matematika (STEM)</option>
                    <option value="SENI">Seni, Musik & Kreatif (ART)</option>
                    <option value="SOSIAL">Sosial, Politik & Sastra (HUMANITIES)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border border-blue-100 bg-blue-50/20 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-blue-600 text-xs uppercase flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> Program Studi Yang Disarankan</h5>
                <div className="mt-3 space-y-2">
                  {karirMinat === 'SAINS' ? (
                    <>
                      <p className="font-bold text-slate-800 text-sm">✓ Teknik Informatika / Data Science</p>
                      <p className="font-bold text-slate-800 text-sm">✓ Kedokteran / Farmasi</p>
                      <p className="font-bold text-slate-800 text-sm">✓ Teknik Elektro / Robotika</p>
                    </>
                  ) : karirMinat === 'SENI' ? (
                    <>
                      <p className="font-bold text-slate-800 text-sm">✓ Desain Komunikasi Visual (DKV)</p>
                      <p className="font-bold text-slate-800 text-sm">✓ Arsitektur / Seni Rupa</p>
                      <p className="font-bold text-slate-800 text-sm">✓ Broadcasting / Film</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-slate-800 text-sm">✓ Hubungan Internasional (HI)</p>
                      <p className="font-bold text-slate-800 text-sm">✓ Ilmu Hukum</p>
                      <p className="font-bold text-slate-800 text-sm">✓ Psikologi / Sosiologi</p>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => Swal.fire('Terkirim', 'Rekomendasi karir dan minat telah terkirim ke portal siswa.', 'success')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-[10px] mt-4 shadow">
                Kirim Rekomendasi Karir Ke Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'laporan_bk' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in-up">
          <div className="border-b pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase">Laporan & Evaluasi BK</h3>
              <p className="text-xs text-slate-400 mt-1">Rekapitulasi statistik pembinaan kedisiplinan dan konseling minat bakat siswa.</p>
            </div>
            <button 
              onClick={() => Swal.fire('Cetak Sukses', 'Dokumen laporan BK komprehensif berhasil diekspor.', 'success')} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
            >
              <FileText className="w-4 h-4" /> Cetak Laporan BK (.pdf)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Sesi Konseling Selesai</span>
              <h4 className="text-3xl font-black text-blue-600">{bimbinganList.length}</h4>
              <p className="text-[10px] text-slate-500 font-semibold">Terselesaikan oleh Koordinator BK</p>
            </div>

            <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Pelanggaran Tercatat</span>
              <h4 className="text-3xl font-black text-rose-600">{pelanggaranList.length}</h4>
              <p className="text-[10px] text-slate-500 font-semibold">Total bobot penegakan aturan</p>
            </div>

            <div className="bg-slate-50 border rounded-2xl p-5 text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Rata-rata Poin Per Kasus</span>
              <h4 className="text-3xl font-black text-amber-500">
                {pelanggaranList.length > 0 
                  ? (pelanggaranList.reduce((acc, p) => acc + p.poin, 0) / pelanggaranList.length).toFixed(1) 
                  : '0'}
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold">Tingkat keparahan pelanggaran</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-2xl p-5 space-y-3 bg-white">
              <h5 className="font-extrabold text-xs text-slate-700 uppercase border-b pb-2">Distribusi Jenis Konseling</h5>
              <div className="space-y-2 text-xs">
                {['Akademik', 'Sosial', 'Karir', 'Pribadi'].map((kategori) => {
                  const count = bimbinganList.filter(b => b.jenis === kategori).length;
                  const total = bimbinganList.length || 1;
                  const pct = ((count / total) * 100).toFixed(0);
                  return (
                    <div key={kategori} className="space-y-1">
                      <div className="flex justify-between font-bold text-slate-600">
                        <span>{kategori}</span>
                        <span>{count} Kasus ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border rounded-2xl p-5 space-y-3 bg-white">
              <h5 className="font-extrabold text-xs text-slate-700 uppercase border-b pb-2">Catatan Pelanggaran Terbanyak</h5>
              <div className="space-y-2 text-xs">
                {pelanggaranList.length > 0 ? (
                  pelanggaranList.slice(0, 3).map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b pb-1.5 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-slate-800">{getSiswaName(p.siswaId)}</p>
                        <p className="text-[10px] text-slate-400">{p.namaPelanggaran}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded text-[10px]">
                        +{p.poin} Poin
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest py-4">KOSONG</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONSELING */}
      {isBimModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 relative border animate-fade-in-up">
            <button onClick={() => setIsBimModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
            <h3 className="font-extrabold text-slate-800 text-lg border-b pb-3 mb-4 flex items-center gap-2">Catat Sesi Konseling</h3>
            <form onSubmit={handleBimbinganSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pilih Siswa</label>
                <select value={bimSiswaId} onChange={(e) => setBimSiswaId(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 font-semibold">
                  {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Konseling</label>
                <select value={bimJenis} onChange={(e: any) => setBimJenis(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 font-semibold">
                  <option value="Akademik">Akademik & Minat Belajar</option>
                  <option value="Sosial">Sosial / Perilaku Teman Sebaya</option>
                  <option value="Karir">Karir & Kuliah Universitas</option>
                  <option value="Pribadi">Keluarga & Pribadi</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Topik Masalah</label>
                <input required value={bimTopik} onChange={(e) => setBimTopik(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5" placeholder="Contoh: Menurunnya motivasi belajar fisika" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Solusi Rekomendasi</label>
                <textarea required value={bimSolusi} onChange={(e) => setBimSolusi(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5" rows={2} placeholder="Contoh: Pemberian jam pendampingan khusus"></textarea>
              </div>
              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setIsBimModalOpen(false)} className="px-5 py-2.5 rounded-xl border text-slate-600 font-bold hover:bg-slate-50">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PELANGGARAN */}
      {isPelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 relative border animate-fade-in-up">
            <button onClick={() => setIsPelModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
            <h3 className="font-extrabold text-slate-800 text-lg border-b pb-3 mb-4 flex items-center gap-2">Catat Pelanggaran Poin</h3>
            <form onSubmit={handlePelanggaranSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pilih Siswa</label>
                <select value={pelSiswaId} onChange={(e) => setPelSiswaId(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 font-semibold">
                  {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Pelanggaran</label>
                <input required value={pelNama} onChange={(e) => setPelNama(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5" placeholder="Contoh: Datang terlambat ke sekolah" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Poin Pelanggaran (Bobot)</label>
                <select value={pelPoin} onChange={(e) => setPelPoin(Number(e.target.value))} className="w-full bg-slate-50 border rounded-xl p-2.5 font-semibold">
                  <option value={5}>Ringan (5 Poin)</option>
                  <option value={15}>Sedang (15 Poin)</option>
                  <option value={50}>Berat (50 Poin)</option>
                  <option value={100}>Sangat Berat (100 Poin)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tindakan Langsung</label>
                <textarea value={pelCatatan} onChange={(e) => setPelCatatan(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5" rows={2} placeholder="Contoh: Dihukum membersihkan musholla sekolah"></textarea>
              </div>
              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setIsPelModalOpen(false)} className="px-5 py-2.5 rounded-xl border text-slate-600 font-bold hover:bg-slate-50">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold">Catat Poin</button>
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
