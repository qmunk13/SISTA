import React, { useState } from 'react';
import {
  TrendingUp,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Archive,
  RefreshCw,
  Users
} from 'lucide-react';
import { User, Siswa } from '../types';
import { getKelasList, getSiswaList, saveSiswaList } from '../lib/storage';

interface KenaikanKelasViewProps {
  currentUser: User;
}

export const KenaikanKelasView: React.FC<KenaikanKelasViewProps> = ({ currentUser }) => {
  const classes = getKelasList();
  const allSiswa = getSiswaList();

  const [sourceClass, setSourceClass] = useState<string>(classes[0] || '');
  const [targetClass, setTargetClass] = useState<string>('');
  const [promotionStatus, setPromotionStatus] = useState<Record<string, 'naik' | 'tinggal'>>({});
  const [message, setMessage] = useState<string | null>(null);

  const sourceStudents = allSiswa.filter(s => s.kelas === sourceClass);

  const handleToggleStatus = (studentId: string, status: 'naik' | 'tinggal') => {
    setPromotionStatus(prev => ({ ...prev, [studentId]: status }));
  };

  const handleProcessPromotion = () => {
    if (!targetClass) {
      alert('Pilih kelas tujuan terlebih dahulu!');
      return;
    }

    if (sourceStudents.length === 0) return;

    if (!confirm(`Apakah Anda yakin ingin memproses kenaikan kelas dari Kelas ${sourceClass} ke Kelas ${targetClass}?`)) {
      return;
    }

    const updatedSiswa = allSiswa.map(s => {
      if (s.kelas === sourceClass) {
        const st = promotionStatus[s.id] || 'naik';
        if (st === 'naik') {
          return { ...s, kelas: targetClass };
        }
      }
      return s;
    });

    saveSiswaList(updatedSiswa);
    setMessage(`Proses kenaikan kelas dari Kelas ${sourceClass} ke Kelas ${targetClass} berhasil diproses!`);
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Kenaikan Kelas & Arsip Tahun Ajaran</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Proses pemindahan rombel masal siswa menjelang tahun ajaran baru.</p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Promotion Config Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h3 className="font-bold text-sm text-slate-800 mb-1">Peta Kenaikan Kelas</h3>
        <p className="text-xs text-slate-500 mb-4">Pilih kelas asal dan kelas tujuan untuk memindahkan seluruh siswa terdaftar.</p>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="sm:col-span-5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dari Kelas (Asal)</label>
            <select
              value={sourceClass}
              onChange={e => setSourceClass(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 outline-none"
            >
              {classes.map(c => (
                <option key={c} value={c}>Kelas {c} ({allSiswa.filter(s => s.kelas === c).length} Siswa)</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 text-center flex justify-center py-2 sm:py-0">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ke Kelas (Tujuan / Lulus)</label>
            <select
              value={targetClass}
              onChange={e => setTargetClass(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 outline-none"
            >
              <option value="">-- Pilih Kelas Tujuan --</option>
              {classes.map(c => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
              <option value="LULUS">🎓 LULUS / ALUMNI</option>
            </select>
          </div>
        </div>

        {/* Student List */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
            <span>Daftar Siswa Kelas {sourceClass} ({sourceStudents.length} Siswa)</span>
            <button
              onClick={handleProcessPromotion}
              disabled={!targetClass || sourceStudents.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                targetClass && sourceStudents.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              Proses Kenaikan Kelas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3">NISN</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3 text-center">Status Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sourceStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold">
                      Tidak ada siswa di dalam kelas {sourceClass}
                    </td>
                  </tr>
                ) : (
                  sourceStudents.map((s, idx) => {
                    const st = promotionStatus[s.id] || 'naik';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{s.nisn}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{s.nama}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleToggleStatus(s.id, 'naik')}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                st === 'naik' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              ✓ Naik Kelas
                            </button>
                            <button
                              onClick={() => handleToggleStatus(s.id, 'tinggal')}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                st === 'tinggal' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              ✗ Tinggal Kelas
                            </button>
                          </div>
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
    </div>
  );
};
