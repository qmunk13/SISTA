import React, { useState } from 'react';
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Send
} from 'lucide-react';
import { PendaftarSPMB } from '../../types';

interface SpmbModuleProps {
  spmbList: PendaftarSPMB[];
  onAddSPMB?: (pendaftar: PendaftarSPMB) => void;
  onAddPendaftar?: (pendaftar: PendaftarSPMB) => void;
  onUpdateStatus: (id: string, status: PendaftarSPMB['Status']) => void;
}

export const SpmbModule: React.FC<SpmbModuleProps> = ({
  spmbList,
  onAddSPMB,
  onAddPendaftar,
  onUpdateStatus
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pendaftar' | 'formulir'>('pendaftar');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const addHandler = onAddSPMB || onAddPendaftar;

  // Form New Registration
  const [form, setForm] = useState({
    Nama: '',
    NIK: '',
    NISN: '',
    TempatLahir: '',
    TanggalLahir: '2009-01-01',
    JK: 'L' as 'L' | 'P',
    Agama: 'Islam',
    Alamat: '',
    AsalSekolah: '',
    Program: 'PPLG (Software Engineering)',
    Jalur: 'Reguler' as 'Reguler' | 'Prestasi' | 'Afirmasi' | 'Zonasi',
    NoHP: '',
    Email: ''
  });

  const handleSubmitSPMB = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.Nama || !form.NIK) return;

    const noPendaftar = 'PPDB-2026-' + Math.floor(1000 + Math.random() * 9000);
    const newEntry: PendaftarSPMB = {
      PendaftarID: 'SPMB-2026-' + Math.floor(100 + Math.random() * 900),
      NoPendaftaran: noPendaftar,
      Nama: form.Nama,
      NIK: form.NIK,
      NISN: form.NISN || '007' + Math.floor(1000000 + Math.random() * 9000000),
      TempatLahir: form.TempatLahir || 'Jakarta',
      TanggalLahir: form.TanggalLahir,
      JK: form.JK,
      Agama: form.Agama,
      Alamat: form.Alamat || 'Jl. Contoh No. 1',
      AsalSekolah: form.AsalSekolah || 'SMP Negeri 1',
      Program: form.Program,
      Jalur: form.Jalur,
      NoHP: form.NoHP || '081234567890',
      Email: form.Email || 'calon@gmail.com',
      Status: 'Pending',
      TanggalDaftar: new Date().toISOString().substring(0, 10)
    };

    if (addHandler) addHandler(newEntry);
    alert('Pendaftaran Berhasil! Nomor Anda: ' + noPendaftar);
    setForm({
      Nama: '', NIK: '', NISN: '', TempatLahir: '', TanggalLahir: '2009-01-01',
      JK: 'L', Agama: 'Islam', Alamat: '', AsalSekolah: '', Program: 'PPLG (Software Engineering)',
      Jalur: 'Reguler', NoHP: '', Email: ''
    });
    setActiveSubTab('pendaftar');
  };

  const filteredPendaftar = spmbList.filter(
    (p) =>
      (selectedStatus === 'ALL' || p.Status === selectedStatus) &&
      (p.Nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.NoPendaftaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.AsalSekolah.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('pendaftar')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'pendaftar'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Data Calon Siswa ({spmbList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('formulir')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'formulir'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Formulir Pendaftaran SPMB
          </button>
        </div>
      </div>

      {activeSubTab === 'pendaftar' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-4 py-2.5 outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="Pending">Pending / Verifikasi</option>
                <option value="Diterima">Diterima</option>
                <option value="Perbaikan">Perbaikan Berkas</option>
                <option value="Tidak Diterima">Tidak Diterima</option>
              </select>

              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau No PPDB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 text-xs font-semibold rounded-xl pl-9 pr-3 py-2 outline-none"
                />
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500">
              Total Pendaftar: <strong className="text-slate-900">{filteredPendaftar.length} Siswa</strong>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">No. Pendaftaran</th>
                  <th className="p-3">Calon Siswa</th>
                  <th className="p-3">Asal Sekolah</th>
                  <th className="p-3">Program & Jalur</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Aksi Verifikasi Panitia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPendaftar.map((p) => (
                  <tr key={p.PendaftarID} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-slate-700">{p.NoPendaftaran}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{p.Nama}</p>
                      <p className="text-[10px] text-slate-400">NISN: {p.NISN} | HP: {p.NoHP}</p>
                    </td>
                    <td className="p-3 font-semibold text-slate-600">{p.AsalSekolah}</td>
                    <td className="p-3">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded font-bold">
                        {p.Program}
                      </span>
                      <p className="text-[10px] text-amber-700 font-bold mt-0.5">Jalur {p.Jalur}</p>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.Status === 'Diterima'
                            ? 'bg-emerald-100 text-emerald-700'
                            : p.Status === 'Perbaikan'
                            ? 'bg-amber-100 text-amber-700'
                            : p.Status === 'Tidak Diterima'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.Status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onUpdateStatus(p.PendaftarID, 'Diterima')}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow hover:bg-emerald-700 transition"
                        >
                          Terima
                        </button>
                        <button
                          onClick={() => onUpdateStatus(p.PendaftarID, 'Perbaikan')}
                          className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-bold shadow hover:bg-amber-600 transition"
                        >
                          Revisi
                        </button>
                        <button
                          onClick={() => onUpdateStatus(p.PendaftarID, 'Tidak Diterima')}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold shadow hover:bg-rose-700 transition"
                        >
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'formulir' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4 text-center">
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200">
              Formulir Pendaftaran Online SPMB 2026
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-2">Penerimaan Siswa Baru</h3>
            <p className="text-xs text-slate-500">Lengkapi data calon peserta didik baru dengan teliti.</p>
          </div>

          <form onSubmit={handleSubmitSPMB} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={form.Nama}
                  onChange={(e) => setForm({ ...form, Nama: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                  placeholder="Sesuai Ijazah SMP/MTs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">NIK (Nomor Induk Kependudukan)</label>
                <input
                  type="text"
                  required
                  value={form.NIK}
                  onChange={(e) => setForm({ ...form, NIK: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none"
                  placeholder="16 digit NIK"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">NISN</label>
                <input
                  type="text"
                  value={form.NISN}
                  onChange={(e) => setForm({ ...form, NISN: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none"
                  placeholder="10 digit NISN"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Asal Sekolah</label>
                <input
                  type="text"
                  required
                  value={form.AsalSekolah}
                  onChange={(e) => setForm({ ...form, AsalSekolah: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                  placeholder="Contoh: SMP Negeri 1 Tambora"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Program Keahlian</label>
                <select
                  value={form.Program}
                  onChange={(e) => setForm({ ...form, Program: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                >
                  <option value="PPLG (Software Engineering)">PPLG (Software Engineering)</option>
                  <option value="TKT (Networking & Cloud)">TKT (Networking & Cloud)</option>
                  <option value="DKV (Digital Design)">DKV (Digital Design)</option>
                  <option value="AKL (Keuangan)">AKL (Keuangan)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Jalur Pendaftaran</label>
                <select
                  value={form.Jalur}
                  onChange={(e) => setForm({ ...form, Jalur: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                >
                  <option value="Reguler">Reguler</option>
                  <option value="Prestasi">Prestasi Akademik / Non-Akademik</option>
                  <option value="Afirmasi">Afirmasi / KJP / KIP</option>
                  <option value="Zonasi">Zonasi Lingkungan</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">No HP / Whatsapp Active</label>
                <input
                  type="text"
                  required
                  value={form.NoHP}
                  onChange={(e) => setForm({ ...form, NoHP: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                  placeholder="0812xxxxxxxx"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Email Calon Siswa</label>
                <input
                  type="email"
                  value={form.Email}
                  onChange={(e) => setForm({ ...form, Email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                  placeholder="email@gmail.com"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 uppercase mb-1">Alamat Lengkap</label>
              <textarea
                value={form.Alamat}
                onChange={(e) => setForm({ ...form, Alamat: e.target.value })}
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                placeholder="Jl. Nama Jalan No., RT/RW, Kelurahan, Kecamatan"
              ></textarea>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Kirim Formulir Pendaftaran SPMB
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
