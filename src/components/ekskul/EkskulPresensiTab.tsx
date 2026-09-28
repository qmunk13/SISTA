import React, { useState, useEffect } from 'react';
import { CheckCircle2, UserCheck, Calendar, Clock, Save, FileText, Check } from 'lucide-react';
import { EkskulItem, EkskulMember, EkskulPresensi } from '../../types';
import { db } from '../../data/db';

export default function EkskulPresensiTab() {
  const [ekskulList, setEkskulList] = useState<EkskulItem[]>([]);
  const [members, setMembers] = useState<EkskulMember[]>([]);
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [materiKegiatan, setMateriKegiatan] = useState('Pemanasan, Latihan Formasi & Penguatan Karakter Disiplin');
  const [instruktur, setInstruktur] = useState('Bambang Sutrisno, S.Pd.');
  
  // Attendance records state { [memberId]: 'H' | 'I' | 'S' | 'A' }
  const [attendance, setAttendance] = useState<Record<string, 'H' | 'I' | 'S' | 'A'>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const clubs = db.get<EkskulItem>('ekskul_items');
    const mbrs = db.get<EkskulMember>('ekskul_members');
    setEkskulList(clubs);
    setMembers(mbrs);
    if (clubs.length > 0) {
      setSelectedEkskulId(clubs[0].id);
      setInstruktur(clubs[0].pelatihNama || clubs[0].pembinaNama);
    }
  }, []);

  // Filter members for selected club
  const clubMembers = members.filter(m => m.ekskulId === selectedEkskulId);

  // Initialize attendance dictionary with 'H' (Hadir) by default
  useEffect(() => {
    const initial: Record<string, 'H' | 'I' | 'S' | 'A'> = {};
    clubMembers.forEach(m => {
      initial[m.id] = 'H';
    });
    setAttendance(initial);
  }, [selectedEkskulId, members]);

  const handleStatusChange = (memberId: string, status: 'H' | 'I' | 'S' | 'A') => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: status
    }));
  };

  const handleSavePresensi = () => {
    const club = ekskulList.find(c => c.id === selectedEkskulId);
    if (!club) return;

    const listToSave: EkskulPresensi[] = clubMembers.map(m => ({
      id: `ATT-EKS-${Date.now()}-${m.id}`,
      ekskulId: club.id,
      ekskulNama: club.nama,
      tanggal: tanggal,
      siswaId: m.siswaId,
      namaSiswa: m.namaSiswa,
      status: attendance[m.id] || 'H',
      materiKegiatan: materiKegiatan,
      instruktur: instruktur
    }));

    const existing = db.get<EkskulPresensi>('ekskul_presensi');
    db.set('ekskul_presensi', [...listToSave, ...existing]);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Session Information Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <UserCheck size={16} className="text-blue-500" />
            <span>Presensi Kegiatan Latihan Ekstrakurikuler</span>
          </h3>
          <span className="text-xs font-mono font-bold text-slate-500">
            {clubMembers.length} Anggota Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Pilih Ekstrakurikuler</label>
            <select
              value={selectedEkskulId}
              onChange={(e) => {
                setSelectedEkskulId(e.target.value);
                const c = ekskulList.find(item => item.id === e.target.value);
                if (c) setInstruktur(c.pelatihNama || c.pembinaNama);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              {ekskulList.map(c => (
                <option key={c.id} value={c.id}>{c.nama} ({c.hariLatihan})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Tanggal Sesi Latihan</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Instruktur / Pembina Sesi Ini</label>
            <input
              type="text"
              value={instruktur}
              onChange={(e) => setInstruktur(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="font-extrabold text-slate-700 block mb-1">Materi / Agenda Latihan</label>
            <input
              type="text"
              value={materiKegiatan}
              onChange={(e) => setMateriKegiatan(e.target.value)}
              placeholder="Misal: Latihan variasi formasi baris-berbaris dan semaphore"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Attendance Checklist Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
          <span>Daftar Presensi Anggota ({clubMembers.length} Siswa)</span>
          <div className="flex gap-4 text-[11px]">
            <span className="text-emerald-700 font-bold">H: Hadir</span>
            <span className="text-blue-700 font-bold">I: Izin</span>
            <span className="text-amber-700 font-bold">S: Sakit</span>
            <span className="text-rose-700 font-bold">A: Alpa</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa & NIS</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4 text-center">Kehadiran Hari Ini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clubMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    Belum ada anggota terdaftar di ekskul ini.
                  </td>
                </tr>
              ) : (
                clubMembers.map((member, idx) => {
                  const currentStatus = attendance[member.id] || 'H';
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <strong className="text-slate-900 block">{member.namaSiswa}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">NIS: {member.nis}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {member.kelas}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                          {member.jabatan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                          {(['H', 'I', 'S', 'A'] as const).map(code => {
                            const isSelected = currentStatus === code;
                            let colorClass = 'text-slate-600 hover:bg-white/60';
                            if (isSelected) {
                              if (code === 'H') colorClass = 'bg-emerald-600 text-white font-black shadow-xs';
                              if (code === 'I') colorClass = 'bg-blue-600 text-white font-black shadow-xs';
                              if (code === 'S') colorClass = 'bg-amber-500 text-white font-black shadow-xs';
                              if (code === 'A') colorClass = 'bg-rose-600 text-white font-black shadow-xs';
                            }
                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => handleStatusChange(member.id, code)}
                                className={`w-8 h-7 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center cursor-pointer ${colorClass}`}
                              >
                                {code}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Save Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {savedSuccess && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check size={16} /> Presensi berhasil disimpan ke basis data!
              </span>
            )}
          </span>

          <button
            onClick={handleSavePresensi}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Save size={15} />
            <span>Simpan Presensi Sesi Latihan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
