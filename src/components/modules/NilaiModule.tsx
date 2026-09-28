import React, { useState } from 'react';
import {
  GraduationCap,
  Award,
  FileSpreadsheet,
  Printer,
  Plus,
  CheckCircle2,
  BookOpen,
  Search
} from 'lucide-react';
import { Nilai, Siswa, Mapel, Kelas } from '../../types';

interface NilaiModuleProps {
  siswaList: Siswa[];
  nilaiList: Nilai[];
  mapelList: Mapel[];
  kelasList: Kelas[];
  onAddNilai: (nilai: Nilai) => void;
}

export const NilaiModule: React.FC<NilaiModuleProps> = ({
  siswaList,
  nilaiList,
  mapelList,
  kelasList,
  onAddNilai
}) => {
  const [activeTab, setActiveTab] = useState<'input' | 'leger' | 'rapor'>('input');
  const [selectedKelas, setSelectedKelas] = useState<string>('KLS-10A');
  const [selectedMapel, setSelectedMapel] = useState<string>('MP-02');
  const [selectedJenis, setSelectedJenis] = useState<'UH1' | 'UH2' | 'UTS' | 'UAS' | 'Tugas'>('UH1');

  // New Score Input
  const [inputNilaiSiswa, setInputNilaiSiswa] = useState<{ [siswaId: string]: number }>({
    'SIS-001': 88,
    'SIS-002': 82,
    'SIS-003': 78,
    'SIS-004': 90
  });

  const handleSaveNilaiBatch = () => {
    Object.entries(inputNilaiSiswa).forEach(([sId, val]) => {
      const numVal = Number(val);
      const mapelObj = mapelList.find((m) => m.MapelID === selectedMapel);
      const kkm = mapelObj?.KKM || 75;
      let predikat = 'C';
      if (numVal >= 90) predikat = 'A';
      else if (numVal >= 80) predikat = 'B';
      else if (numVal >= 70) predikat = 'C';
      else predikat = 'D';

      const newNilai: Nilai = {
        NilaiID: 'NIL-' + Math.floor(1000 + Math.random() * 9000),
        SiswaID: sId,
        MapelID: selectedMapel,
        GuruID: 'GURU-01',
        KelasID: selectedKelas,
        SemesterID: 'SEM-1',
        TahunAjaranID: 'TA-2026/2027',
        JenisNilai: selectedJenis,
        Nilai: numVal,
        KKM: kkm,
        Predikat: predikat,
        Deskripsi: `Penguasaan materi ${selectedJenis} tergolong ${predikat}`,
        TanggalInput: new Date().toISOString().substring(0, 10)
      };
      onAddNilai(newNilai);
    });
  };

  const filteredSiswa = siswaList.filter((s) => selectedKelas === 'ALL' || s.KelasID === selectedKelas);

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('input')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'input'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Input Nilai Per Kelas
          </button>
          <button
            onClick={() => setActiveTab('leger')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'leger'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Leger Transkrip Nilai
          </button>
          <button
            onClick={() => setActiveTab('rapor')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'rapor'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pratinjau Rapor Digital
          </button>
        </div>
      </div>

      {activeTab === 'input' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pilih Kelas</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none"
              >
                {kelasList.map((k) => (
                  <option key={k.KelasID} value={k.KelasID}>
                    {k.NamaKelas}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mata Pelajaran</label>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none"
              >
                {mapelList.map((m) => (
                  <option key={m.MapelID} value={m.MapelID}>
                    {m.NamaMapel} (KKM: {m.KKM})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jenis Penilaian</label>
              <select
                value={selectedJenis}
                onChange={(e) => setSelectedJenis(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none"
              >
                <option value="UH1">Ulangan Harian 1 (UH1)</option>
                <option value="UH2">Ulangan Harian 2 (UH2)</option>
                <option value="Tugas">Tugas / Project</option>
                <option value="UTS">UTS Semester</option>
                <option value="UAS">UAS Semester</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Siswa</th>
                  <th className="p-3">NISN</th>
                  <th className="p-3 text-center">KKM Mapel</th>
                  <th className="p-3 text-center">Nilai Angka (0-100)</th>
                  <th className="p-3 text-center">Status Lulus KKM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSiswa.map((s) => {
                  const val = inputNilaiSiswa[s.SiswaID] || 0;
                  const mapelObj = mapelList.find((m) => m.MapelID === selectedMapel);
                  const kkm = mapelObj?.KKM || 75;
                  const isTuntas = val >= kkm;

                  return (
                    <tr key={s.SiswaID} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-800">{s.NamaLengkap}</td>
                      <td className="p-3 font-mono text-slate-500">{s.NISN}</td>
                      <td className="p-3 text-center font-bold text-purple-700">{kkm}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={val}
                          onChange={(e) =>
                            setInputNilaiSiswa({ ...inputNilaiSiswa, [s.SiswaID]: Number(e.target.value) })
                          }
                          className="w-20 text-center font-bold bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 focus:border-purple-500 outline-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        {isTuntas ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
                            Tuntas (A/B)
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-bold">
                            Belum Tuntas
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveNilaiBatch}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan Penilaian Ke Master Sheet
            </button>
          </div>
        </div>
      )}

      {activeTab === 'leger' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800">Transkrip Nilai Leger Semua Siswa</h3>
            <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <Printer className="w-4 h-4" /> Cetak Leger
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">SiswaID</th>
                  <th className="p-3">Mapel ID</th>
                  <th className="p-3">Jenis Nilai</th>
                  <th className="p-3 text-center">Nilai</th>
                  <th className="p-3 text-center">Predikat</th>
                  <th className="p-3">Deskripsi Capaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nilaiList.map((n) => (
                  <tr key={n.NilaiID} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-800">{n.SiswaID}</td>
                    <td className="p-3 font-mono">{n.MapelID}</td>
                    <td className="p-3 font-bold text-purple-700">{n.JenisNilai}</td>
                    <td className="p-3 text-center font-black text-slate-900">{n.Nilai}</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        {n.Predikat}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{n.Deskripsi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rapor' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="text-center border-b border-slate-200 pb-6">
            <h2 className="text-xl font-black text-slate-900 uppercase">RAPOR HASIL BELAJAR SISWA</h2>
            <p className="text-xs text-slate-500 mt-1">SEKOLAH UNGGULAN TERPADU INDONESIA</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>Nama Siswa: <strong className="text-slate-900">Budi Santoso</strong></div>
            <div>Kelas / Jurusan: <strong className="text-slate-900">X PPLG 1</strong></div>
            <div>NISN: <strong className="text-slate-900">0061234567</strong></div>
            <div>Semester / TA: <strong className="text-slate-900">Ganjil / 2025-2026</strong></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Mata Pelajaran</th>
                  <th className="p-3 text-center">KKM</th>
                  <th className="p-3 text-center">Nilai Akhir</th>
                  <th className="p-3 text-center">Predikat</th>
                  <th className="p-3">Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 font-bold">Pemrograman Web & Mobile</td>
                  <td className="p-3 text-center">78</td>
                  <td className="p-3 text-center font-bold">92</td>
                  <td className="p-3 text-center font-bold text-emerald-600">A</td>
                  <td className="p-3 text-slate-600">Sangat mahir dalam komponen React & Tailwind CSS.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Matematika Terapan</td>
                  <td className="p-3 text-center">75</td>
                  <td className="p-3 text-center font-bold">88</td>
                  <td className="p-3 text-center font-bold text-emerald-600">A</td>
                  <td className="p-3 text-slate-600">Sangat baik dalam menyelesaikan persamaan aljabar.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => alert('Cetak PDF Rapor diproses!')}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Cetak Rapor Digital PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
