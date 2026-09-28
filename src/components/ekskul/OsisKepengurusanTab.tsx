import React, { useState, useEffect } from 'react';
import { Shield, Target, Calendar, User, CheckCircle2, Clock, Plus, Edit2, DollarSign, X } from 'lucide-react';
import { OsisPengurus, OsisProker } from '../../types';
import { db } from '../../data/db';

export default function OsisKepengurusanTab() {
  const [pengurusList, setPengurusList] = useState<OsisPengurus[]>([]);
  const [prokerList, setProkerList] = useState<OsisProker[]>([]);
  const [activeSubView, setActiveSubView] = useState<'struktur' | 'proker'>('struktur');

  const [isProkerModalOpen, setIsProkerModalOpen] = useState(false);
  const [newProker, setNewProker] = useState<Partial<OsisProker>>({
    namaProgram: '',
    divisi: 'Sekbid 2 (Budi Pekerti & Karakter)',
    waktuPelaksanaan: 'Maret 2026',
    anggaran: 500000,
    status: 'Perencanaan',
    penanggungJawab: '',
    deskripsi: ''
  });

  const loadData = () => {
    setPengurusList(db.get<OsisPengurus>('osis_pengurus'));
    setProkerList(db.get<OsisProker>('osis_proker'));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProker.namaProgram || !newProker.penanggungJawab) {
      alert('Nama program dan penanggung jawab wajib diisi!');
      return;
    }

    const item: OsisProker = {
      id: `PROKER-${Date.now().toString().slice(-4)}`,
      namaProgram: newProker.namaProgram || '',
      divisi: newProker.divisi || 'Umum',
      waktuPelaksanaan: newProker.waktuPelaksanaan || '2026',
      anggaran: Number(newProker.anggaran) || 0,
      status: newProker.status as any || 'Perencanaan',
      penanggungJawab: newProker.penanggungJawab || '',
      deskripsi: newProker.deskripsi || ''
    };

    const updated = [item, ...prokerList];
    db.set('osis_proker', updated);
    setProkerList(updated);
    setIsProkerModalOpen(false);
  };

  const handleToggleProkerStatus = (proker: OsisProker) => {
    const nextStatusMap: Record<string, 'Perencanaan' | 'Sedang Berjalan' | 'Selesai'> = {
      'Perencanaan': 'Sedang Berjalan',
      'Sedang Berjalan': 'Selesai',
      'Selesai': 'Perencanaan'
    };
    const nextStatus = nextStatusMap[proker.status] || 'Perencanaan';
    const updated = prokerList.map(p => p.id === proker.id ? { ...p, status: nextStatus } : p);
    db.set('osis_proker', updated);
    setProkerList(updated);
  };

  return (
    <div className="space-y-6">
      {/* Subnav Pills for OSIS */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView('struktur')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
              activeSubView === 'struktur'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Struktur Organisasi OSIS
          </button>
          <button
            onClick={() => setActiveSubView('proker')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
              activeSubView === 'proker'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Program Kerja (Proker) & Anggaran
          </button>
        </div>

        {activeSubView === 'proker' && (
          <button
            onClick={() => setIsProkerModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Program Kerja</span>
          </button>
        )}
      </div>

      {/* VIEW 1: STRUKTUR ORGANISASI OSIS */}
      {activeSubView === 'struktur' && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-base font-black text-slate-900">
              Dewan Pengurus Organisasi Siswa Intra Sekolah (OSIS)
            </h3>
            <p className="text-xs text-slate-500">Masa Bakti 2025/2026 • SD Negeri Kecamatan Tambora</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pengurusList.map((p) => {
              const isBPH = p.divisi === 'Badan Pengurus Harian (BPH)';
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-3xl p-5 border shadow-xs flex flex-col items-center text-center space-y-3 relative overflow-hidden ${
                    isBPH ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200/80'
                  }`}
                >
                  {isBPH && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider">
                      BPH
                    </div>
                  )}

                  {/* Photo Avatar */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-slate-100 shadow-xs">
                    <img src={p.fotoUrl} alt={p.namaSiswa} className="w-full h-full object-cover" />
                  </div>

                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-black inline-block mb-1 border border-blue-200">
                      {p.jabatan}
                    </span>
                    <h4 className="text-sm font-black text-slate-900">{p.namaSiswa}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">Kelas {p.kelas} • NIS {p.nis}</p>
                  </div>

                  <div className="w-full pt-2 border-t border-slate-100 text-[10px] text-slate-600 font-medium">
                    <p className="font-bold text-slate-700 mb-0.5">{p.divisi}</p>
                    <p className="text-slate-500 line-clamp-2 leading-relaxed">{p.tugasUtama}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: PROGRAM KERJA OSIS */}
      {activeSubView === 'proker' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Program Kerja</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{prokerList.length} Agenda</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Anggaran OSIS</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                Rp {prokerList.reduce((acc, p) => acc + p.anggaran, 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Program Terlaksana</span>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {prokerList.filter(p => p.status === 'Selesai').length} dari {prokerList.length} Proker
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Nama Program & Divisi</th>
                    <th className="py-3.5 px-4">Waktu Pelaksanaan</th>
                    <th className="py-3.5 px-4">Penanggung Jawab (PIC)</th>
                    <th className="py-3.5 px-4">Alokasi Anggaran</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prokerList.map((proker) => {
                    return (
                      <tr key={proker.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block">{proker.namaProgram}</strong>
                          <span className="text-[10px] text-slate-500">{proker.divisi}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {proker.waktuPelaksanaan}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {proker.penanggungJawab}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          Rp {proker.anggaran.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            proker.status === 'Selesai'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : proker.status === 'Sedang Berjalan'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {proker.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleProkerStatus(proker)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            Ubah Status
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Proker Modal */}
      {isProkerModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Tambah Program Kerja OSIS</h3>
              <button
                onClick={() => setIsProkerModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProker} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Nama Program Kerja *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Class Meeting & Turnamen Futsal Antarkelas"
                  value={newProker.namaProgram || ''}
                  onChange={(e) => setNewProker({ ...newProker, namaProgram: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Divisi / Sekbid Penyelenggara</label>
                <input
                  type="text"
                  value={newProker.divisi || ''}
                  onChange={(e) => setNewProker({ ...newProker, divisi: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Target Waktu</label>
                  <input
                    type="text"
                    placeholder="Maret 2026"
                    value={newProker.waktuPelaksanaan || ''}
                    onChange={(e) => setNewProker({ ...newProker, waktuPelaksanaan: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Alokasi Anggaran (Rp)</label>
                  <input
                    type="number"
                    value={newProker.anggaran || 0}
                    onChange={(e) => setNewProker({ ...newProker, anggaran: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Penanggung Jawab (PIC) *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Siswa PIC"
                  value={newProker.penanggungJawab || ''}
                  onChange={(e) => setNewProker({ ...newProker, penanggungJawab: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProkerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-xs"
                >
                  Simpan Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
