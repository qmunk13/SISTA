import React, { useState } from 'react';
import { 
  BookOpen, 
  Award, 
  UserCheck, 
  Plus, 
  Save, 
  Layers, 
  ArrowUpRight, 
  FileSpreadsheet, 
  TrendingUp,
  CheckCircle2,
  Users
} from 'lucide-react';
import { UserSession } from '../types/schema';

interface GuruModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
}

export const GuruModule: React.FC<GuruModuleProps> = ({ userSession, dbData, setDbData }) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'nilai' | 'bimbingan' | 'kenaikan'>('agenda');
  const [selectedKelas, setSelectedKelas] = useState<string>('10-A');

  // State Agenda Jurnal
  const [agendaJudul, setAgendaJudul] = useState('');
  const [agendaMateri, setAgendaMateri] = useState('');

  // State Nilai
  const [nilAhmad, setNilAhmad] = useState<number>(85);
  const [nilSiti, setNilSiti] = useState<number>(90);

  const handleSimpanAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaJudul) return;

    setDbData(prev => ({
      ...prev,
      AGENDA: [
        ...(prev['AGENDA'] || []),
        {
          idAgenda: `AGD-${Date.now()}`,
          judul: agendaJudul,
          kategori: 'Kegiatan Belajar Mengajar',
          tanggal: new Date().toISOString().split('T')[0],
          waktu: new Date().toLocaleTimeString('id-ID'),
          lokasi: `Ruang Kelas ${selectedKelas}`,
          keterangan: agendaMateri || 'Materi pembelajaran tersampaikan tuntas.'
        }
      ]
    }));

    setAgendaJudul('');
    setAgendaMateri('');
    alert('Jurnal Agenda Mengajar Berhasil Disimpan!');
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/60 border border-slate-200 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'agenda' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Jurnal Agenda Mengajar
        </button>
        <button
          onClick={() => setActiveTab('nilai')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'nilai' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" /> Input Nilai & Leger
        </button>
        <button
          onClick={() => setActiveTab('bimbingan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'bimbingan' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Catatan Bimbingan
        </button>
        <button
          onClick={() => setActiveTab('kenaikan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'kenaikan' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Kenaikan Kelas & Alumni
        </button>
      </div>

      {/* TAB 1: AGENDA MENGAJAR */}
      {activeTab === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSimpanAgenda} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> Input Jurnal Agenda
            </h3>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kelas Target</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none shadow-sm font-bold"
              >
                <option value="SEMUA">Semua Kelas</option>
                {(dbData['KELAS'] || []).map(k => (
                  <option key={k.id || k.nama} value={k.nama || k.id}>{k.nama || k.id}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Judul / Topik Bab</label>
              <input
                type="text"
                value={agendaJudul}
                onChange={(e) => setAgendaJudul(e.target.value)}
                placeholder="Contoh: Bab 3 Persamaan Kuadrat"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none shadow-sm"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Materi & Rangkuman KBM</label>
              <textarea
                value={agendaMateri}
                onChange={(e) => setAgendaMateri(e.target.value)}
                rows={3}
                placeholder="Penjelasan latihan soal dan tugas kelompok..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none shadow-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Simpan Jurnal Mengajar
            </button>
          </form>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4">Riwayat Agenda Mengajar (AGENDA)</h3>

            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {(dbData['AGENDA'] || [
                { idAgenda: 'AGD-101', judul: 'Eksponen & Logaritma', tanggal: '2026-07-25', waktu: '08:00', lokasi: 'Ruang 10-A', keterangan: 'Siswa dapat menyelesaikan latihan lembar kerja' }
              ]).map((a, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-blue-600">{a.judul}</h4>
                    <span className="text-[10px] font-mono text-slate-500">{a.tanggal} • {a.waktu}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{a.keterangan}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">{a.lokasi}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INPUT NILAI & LEGER */}
      {activeTab === 'nilai' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Evaluasi Penilaian & Leger Rapor</h3>
              <p className="text-xs text-slate-500">Penginputan Tugas, UTS, UAS, dan Kalkulasi Nilai Akhir (NILAI)</p>
            </div>
            <button
              onClick={() => alert('Leger Nilai berhasil di-generate ke format Excel!')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Leger Excel
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-4">NISN / PDKT</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4 text-center">Nilai Tugas</th>
                  <th className="p-4 text-center">Nilai UTS</th>
                  <th className="p-4 text-center">Nilai UAS</th>
                  <th className="p-4 text-center">Nilai Akhir</th>
                  <th className="p-4 text-center">Predikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-4 font-mono text-blue-600">3122140501</td>
                  <td className="p-4 font-bold text-slate-800">Ahmad Rizki</td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      value={nilAhmad}
                      onChange={(e) => setNilAhmad(Number(e.target.value))}
                      className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-center text-xs font-bold text-slate-800 shadow-sm"
                    />
                  </td>
                  <td className="p-4 text-center font-bold">80</td>
                  <td className="p-4 text-center font-bold">90</td>
                  <td className="p-4 text-center font-extrabold text-emerald-600">
                    {Math.round((nilAhmad + 80 + 90) / 3)}
                  </td>
                  <td className="p-4 text-center font-bold text-blue-600">A (Sangat Baik)</td>
                </tr>

                <tr className="hover:bg-slate-50/80 transition">
                  <td className="p-4 font-mono text-blue-600">3122140502</td>
                  <td className="p-4 font-bold text-slate-800">Siti Nurhaliza</td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      value={nilSiti}
                      onChange={(e) => setNilSiti(Number(e.target.value))}
                      className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-center text-xs font-bold text-slate-800 shadow-sm"
                    />
                  </td>
                  <td className="p-4 text-center font-bold">88</td>
                  <td className="p-4 text-center font-bold">92</td>
                  <td className="p-4 text-center font-extrabold text-emerald-600">
                    {Math.round((nilSiti + 88 + 92) / 3)}
                  </td>
                  <td className="p-4 text-center font-bold text-blue-600">A (Sangat Baik)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BIMBINGAN SISWA */}
      {activeTab === 'bimbingan' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base">Catatan Bimbingan & Konseling (BIMBINGAN)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(dbData['BIMBINGAN'] || [
              { id: 'BIM-001', NoPDKT: 'PDKT-101', nama_siswa: 'Ahmad Rizki', kelasId: '10-A', tanggal: '2026-07-20', jenis: 'Akademik', topik: 'Diskusi Prestasi Olimpiade', solusi: 'Pengayaan materi lanjutan matematika', guruWali: 'Pak Joko Susilo, M.Pd' }
            ]).map((b, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-xs text-slate-800">{b.nama_siswa} ({b.kelasId})</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold">{b.jenis}</span>
                </div>
                <p className="text-xs text-slate-700 font-semibold">Topik: {b.topik}</p>
                <p className="text-xs text-slate-500">Solusi: {b.solusi}</p>
                <div className="pt-2 text-[10px] text-slate-400 font-mono flex justify-between">
                  <span>Wali: {b.guruWali}</span>
                  <span>{b.tanggal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: KENAIKAN KELAS & ALUMNI */}
      {activeTab === 'kenaikan' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Proses Kenaikan Kelas & Kelulusan</h3>
              <p className="text-xs text-emerald-700">Promosi otomatis tingkat kelas dan pengarsipan data alumni (KENAIKAN_KELAS & KELULUSAN)</p>
            </div>
            <button
              onClick={() => alert('Proses Promosi Kelas Berhasil!')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              Eksekusi Kenaikan Kelas Massal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(dbData['SISWA'] || []).map((s) => (
              <div key={s.nopdkt} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">{s['Nama Lengkap']}</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Kelas Saat Ini: <span className="text-blue-600 font-bold">{s['Kelas Saat ini']}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    Promosi Ke Kelas 11
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
