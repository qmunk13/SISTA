import React, { useState } from 'react';
import { Laptop2, Key, HelpCircle, CheckCircle2, Clock, Plus, Play, Trophy, Sparkles } from 'lucide-react';
import { BankSoal, Ujian, HasilUjian } from '../../types';

interface UjianModuleProps {
  bankSoalList: BankSoal[];
  ujianList: Ujian[];
  hasilUjianList: HasilUjian[];
}

export const UjianModule: React.FC<UjianModuleProps> = ({
  bankSoalList,
  ujianList,
  hasilUjianList
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'jadwal' | 'soal' | 'hasil'>('jadwal');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenVerified, setTokenVerified] = useState(false);

  return (
    <div className="space-y-6">
      {/* Sub navigation bar */}
      <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('jadwal')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeSubTab === 'jadwal'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Laptop2 className="w-4 h-4" /> Jadwal Ujian & Token CBT
          </button>
          <button
            onClick={() => setActiveSubTab('soal')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeSubTab === 'soal'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Bank Soal Master ({bankSoalList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('hasil')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeSubTab === 'hasil'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-4 h-4" /> Hasil Ujian & Nilai
          </button>
        </div>

        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-colors text-xs flex items-center gap-2">
          <Plus className="w-4 h-4" /> Buat Ujian Baru
        </button>
      </div>

      {activeSubTab === 'jadwal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ujian List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Jadwal Ujian Aktif</h3>
            {ujianList.map((uj) => (
              <div key={uj.UjianID} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {uj.UjianID}
                    </span>
                    <h4 className="font-bold text-slate-900 text-base mt-2">{uj.NamaUjian}</h4>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-600" /> {uj.Durasi} Menit</span>
                      <span>•</span>
                      <span>{uj.JumlahSoal} Soal Pilihan Ganda</span>
                      <span>•</span>
                      <span>Tanggal: {uj.Tanggal}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 block mb-1">Token Ruang:</span>
                    <span className="font-mono text-sm font-extrabold bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1 rounded-md tracking-wider">
                      {uj.Token}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Status: {uj.Status}
                  </span>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3.5 py-1.5 rounded-lg shadow-xs transition-colors flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5" /> Kerjakan Ujian
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Token Simulator Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
              <Key className="w-4 h-4" /> Verification Token CBT
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Siswa wajib memasukkan token yang dibagikan oleh pengawas ujian sebelum memulai pengerjaan soal CBT.
            </p>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-700">Masukkan Token Ujian</label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                placeholder="Contoh: KTCT26"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => setTokenVerified(tokenInput === 'KTCT26' || tokenInput === 'MAT2026')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-xs transition-colors shadow-xs"
              >
                Verifikasi Token
              </button>

              {tokenVerified && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Token Valid! Ruang ujian CBT siap diakses.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'soal' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Daftar Soal di Bank Soal Terpusat</h3>
            <span className="text-xs text-slate-500">Tersambung ke Tab Master Spreadsheet <code className="font-mono text-indigo-600">BANK_SOAL</code></span>
          </div>

          <div className="p-4 space-y-4">
            {bankSoalList.map((bs, idx) => (
              <div key={bs.BankSoalID} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600">Soal #{idx + 1} - Bab: {bs.Bab}</span>
                  <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Tingkat: {bs.Tingkat}</span>
                </div>
                <p className="text-xs font-semibold text-slate-900">{bs.Soal}</p>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className={`p-2 rounded border ${bs.Jawaban === 'A' ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>A. {bs.PilihanA}</div>
                  <div className={`p-2 rounded border ${bs.Jawaban === 'B' ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>B. {bs.PilihanB}</div>
                  <div className={`p-2 rounded border ${bs.Jawaban === 'C' ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>C. {bs.PilihanC}</div>
                  <div className={`p-2 rounded border ${bs.Jawaban === 'D' ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>D. {bs.PilihanD}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'hasil' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm">Rekap Hasil Ujian Siswa</h3>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3">Hasil ID</th>
                <th className="p-3">Ujian ID</th>
                <th className="p-3">Siswa ID</th>
                <th className="p-3 text-center">Benar</th>
                <th className="p-3 text-center">Salah</th>
                <th className="p-3 text-center">Nilai Final</th>
                <th className="p-3">Durasi</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hasilUjianList.map((hu) => (
                <tr key={hu.HasilUjianID} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-indigo-600">{hu.HasilUjianID}</td>
                  <td className="p-3 font-mono">{hu.UjianID}</td>
                  <td className="p-3 font-medium">{hu.SiswaID}</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">{hu.Benar}</td>
                  <td className="p-3 text-center text-rose-600 font-bold">{hu.Salah}</td>
                  <td className="p-3 text-center text-sm font-black text-slate-900">{hu.Nilai}</td>
                  <td className="p-3 text-slate-500">{hu.Durasi}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {hu.Status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
