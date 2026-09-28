import React, { useState, useEffect } from 'react';
import { Award, Save, Check, Search, BookOpen, Sparkles } from 'lucide-react';
import { EkskulItem, EkskulNilaiRapor, EkskulMember } from '../../types';
import { db } from '../../data/db';

export default function EkskulNilaiTab() {
  const [ekskulList, setEkskulList] = useState<EkskulItem[]>([]);
  const [members, setMembers] = useState<EkskulMember[]>([]);
  const [nilais, setNilais] = useState<EkskulNilaiRapor[]>([]);
  const [selectedEkskulId, setSelectedEkskulId] = useState('');
  const [semester, setSemester] = useState('Ganjil');
  const [tahunAjaran, setTahunAjaran] = useState('2026/2027');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Local draft scores state: { [siswaId]: { predikat: 'A'|'B'|'C', deskripsi: string } }
  const [draftNilai, setDraftNilai] = useState<Record<string, { predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang'; deskripsi: string }>>({});

  useEffect(() => {
    const clubs = db.get<EkskulItem>('ekskul_items');
    const mbrs = db.get<EkskulMember>('ekskul_members');
    const scores = db.get<EkskulNilaiRapor>('ekskul_nilai');
    setEkskulList(clubs);
    setMembers(mbrs);
    setNilais(scores);

    if (clubs.length > 0) {
      setSelectedEkskulId(clubs[0].id);
    }
  }, []);

  const currentClubMembers = members.filter(m => m.ekskulId === selectedEkskulId);

  // Synchronize draft scores when club or semester changes
  useEffect(() => {
    const drafts: Record<string, { predikat: any; deskripsi: string }> = {};
    currentClubMembers.forEach(m => {
      const existing = nilais.find(n => n.ekskulId === selectedEkskulId && n.siswaId === m.siswaId && n.semester === semester);
      if (existing) {
        drafts[m.siswaId] = {
          predikat: existing.predikat,
          deskripsi: existing.deskripsi
        };
      } else {
        drafts[m.siswaId] = {
          predikat: 'Sangat Baik',
          deskripsi: `Sangat aktif mengikuti latihan mingguan, menunjukkan disiplin tinggi dan kerja sama tim yang prima.`
        };
      }
    });
    setDraftNilai(drafts);
  }, [selectedEkskulId, semester, members, nilais]);

  const handleUpdateDraft = (siswaId: string, field: 'predikat' | 'deskripsi', value: string) => {
    setDraftNilai(prev => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        [field]: value
      }
    }));
  };

  const handleSaveAll = () => {
    const club = ekskulList.find(c => c.id === selectedEkskulId);
    if (!club) return;

    const listToSave: EkskulNilaiRapor[] = currentClubMembers.map(m => ({
      id: `SCORE-${club.id}-${m.siswaId}-${semester}`,
      ekskulId: club.id,
      ekskulNama: club.nama,
      siswaId: m.siswaId,
      namaSiswa: m.namaSiswa,
      kelas: m.kelas,
      semester: semester,
      tahunAjaran: tahunAjaran,
      predikat: draftNilai[m.siswaId]?.predikat || 'Baik',
      deskripsi: draftNilai[m.siswaId]?.deskripsi || 'Mengikuti kegiatan dengan baik.',
      tanggalInput: new Date().toISOString().split('T')[0]
    }));

    // Filter out old ones and insert new
    const otherScores = nilais.filter(n => !(n.ekskulId === selectedEkskulId && n.semester === semester));
    const merged = [...listToSave, ...otherScores];
    db.set('ekskul_nilai', merged);
    setNilais(merged);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award size={16} className="text-amber-500" />
              <span>Penilaian Ekstrakurikuler untuk Buku Rapor Merdeka</span>
            </h3>
            <p className="text-xs text-slate-400">Predikat capaian dan deskripsi kualitatif otomatis masuk ke Buku Rapor</p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
            {currentClubMembers.length} Peserta Didik
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Ekstrakurikuler</label>
            <select
              value={selectedEkskulId}
              onChange={(e) => setSelectedEkskulId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              {ekskulList.map(c => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Tahun Ajaran</label>
            <input
              type="text"
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Grade Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 w-52">Nama Siswa & Kelas</th>
                <th className="py-3.5 px-4 w-44">Predikat Capaian</th>
                <th className="py-3.5 px-4">Deskripsi / Catatan Pembina (Buku Rapor)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentClubMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                    Belum ada anggota terdaftar pada ekstrakurikuler ini.
                  </td>
                </tr>
              ) : (
                currentClubMembers.map((member, idx) => {
                  const draft = draftNilai[member.siswaId] || { predikat: 'Sangat Baik', deskripsi: '' };
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <strong className="text-slate-900 block">{member.namaSiswa}</strong>
                        <span className="text-[10px] text-slate-500">Kelas {member.kelas} • NIS: {member.nis}</span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={draft.predikat}
                          onChange={(e) => handleUpdateDraft(member.siswaId, 'predikat', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                          <option value="Sangat Baik">A (Sangat Baik)</option>
                          <option value="Baik">B (Baik)</option>
                          <option value="Cukup">C (Cukup)</option>
                          <option value="Kurang">D (Kurang)</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <textarea
                          rows={2}
                          value={draft.deskripsi}
                          onChange={(e) => handleUpdateDraft(member.siswaId, 'deskripsi', e.target.value)}
                          placeholder="Tulis capaian kompetensi siswa dalam ekstrakurikuler..."
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Save Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {savedSuccess && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check size={16} /> Nilai Rapor Ekstrakurikuler berhasil disinkronkan!
              </span>
            )}
          </span>

          <button
            onClick={handleSaveAll}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Save size={15} />
            <span>Simpan Nilai ke E-Rapor</span>
          </button>
        </div>
      </div>
    </div>
  );
}
