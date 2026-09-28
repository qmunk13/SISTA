import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { getActiveClasses, getAllClasses, matchClass, matchStatusActive, formatClassLabel, sortStudentsByStatusAndName, getStatusPriority, triggerPrint } from '../../lib/utils';
import { getMapelNamesForClass } from '../../lib/academicSubjects';
import { exportToExcel } from '../../lib/excel';
import { 
  Trophy, Medal, Award, Search, Filter, Printer, 
  Sparkles, CheckCircle2, ChevronRight, Star, TrendingUp, Download,
  FileSpreadsheet
} from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

const DEFAULT_MAPEL = [
  'Pendidikan Agama dan Budi Pekerti',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
  'PJOK',
  'Seni Rupa / Musik',
  'Bahasa Inggris',
  'Muatan Lokal'
];

export default function PeringkatRankingTab() {
  const { students, teachers, settings } = useStore();
  const activeStudents = useMemo(() => {
    return students.filter(s => matchStatusActive(s?.status));
  }, [students]);

  const classesList = useMemo(() => {
    return getAllClasses(activeStudents);
  }, [activeStudents]);

  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(() => {
    return (settings.semester === 'Genap' || settings.semester === 'Semester 2') ? 'Genap' : 'Ganjil';
  });

  React.useEffect(() => {
    const sem = (settings.semester === 'Genap' || settings.semester === 'Semester 2') ? 'Genap' : 'Ganjil';
    setSelectedSemester(sem);
    const handleSemChange = (e: any) => {
      if (e.detail?.semesterType) {
        setSelectedSemester(e.detail.semesterType);
      }
    };
    window.addEventListener('academic-semester-changed', handleSemChange);
    return () => window.removeEventListener('academic-semester-changed', handleSemChange);
  }, [settings.semester, settings.tahunPelajaran]);
  const [selectedClass, setSelectedClass] = useState<string>(classesList[0] || '1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCertificateStudent, setSelectedCertificateStudent] = useState<any | null>(null);

  // Students in class (Excludes Pindah, Lulus, Keluar)
  const classStudents = useMemo(() => {
    if (!activeStudents) return [];
    return activeStudents.filter(s => matchClass(s.class, selectedClass));
  }, [activeStudents, selectedClass]);

  // Wali Kelas & Kepsek
  const waliKelas = useMemo(() => {
    return teachers.find(t => matchClass(t.class, selectedClass)) || teachers[0];
  }, [teachers, selectedClass]);

  const kepsek = useMemo(() => {
    return teachers.find(t => t.class === 'Kepala Sekolah' || (t.class && t.class.toLowerCase().includes('kepala'))) || {
      name: settings.headmasterName || 'Kepala Sekolah',
      nip: settings.headmasterNip || '-'
    };
  }, [teachers, settings]);

  const [dbRefreshKey, setDbRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setDbRefreshKey(prev => prev + 1);
    window.addEventListener('erp-db-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  // Class specific subjects list
  const activeMapelList = useMemo(() => {
    return getMapelNamesForClass(selectedClass);
  }, [selectedClass]);

  // Stored grades map
  const gradesMap = useMemo(() => {
    return (db.get('nilai_akademik_map') as any) || {};
  }, [dbRefreshKey]);

  // Smart Calculation for Ranking based on REAL grades
  const rankedStudents = useMemo(() => {
    const list = classStudents.map((s) => {
      // Calculate total & average score across subjects from real db grades
      let totalScore = 0;
      let gradedSubjectsCount = 0;

      activeMapelList.forEach((mapel) => {
        const gradeKey = `${s.id}_${selectedSemester}_${mapel}`;
        const saved = gradesMap[gradeKey];
        if (saved && typeof saved.nilaiAkhir === 'number' && saved.nilaiAkhir > 0) {
          totalScore += saved.nilaiAkhir;
          gradedSubjectsCount++;
        }
      });

      const averageScore = gradedSubjectsCount > 0 ? Math.round((totalScore / gradedSubjectsCount) * 10) / 10 : null;

      return {
        ...s,
        totalScore,
        gradedSubjectsCount,
        averageScore,
        ketercapaian: averageScore !== null 
          ? (averageScore >= 85 ? 'Sangat Baik (A)' : averageScore >= 75 ? 'Baik (B)' : 'Perlu Bimbingan')
          : 'Belum Dinilai'
      };
    });

    // Sort: students with grades first (descending by averageScore, totalScore), then by status priority (Aktif -> Tidak Aktif -> Belum), then by name
    list.sort((a, b) => {
      if (a.averageScore !== null && b.averageScore === null) return -1;
      if (a.averageScore === null && b.averageScore !== null) return 1;
      if (a.averageScore !== null && b.averageScore !== null) {
        const scoreDiff = (b.averageScore - a.averageScore) || (b.totalScore - a.totalScore);
        if (scoreDiff !== 0) return scoreDiff;
      }
      const pA = getStatusPriority(a.status);
      const pB = getStatusPriority(b.status);
      if (pA !== pB) return pA - pB;
      return String(a.name || '').localeCompare(String(b.name || ''), 'id');
    });

    return list.map((item, index) => ({
      ...item,
      rank: item.averageScore !== null ? index + 1 : '-'
    }));
  }, [classStudents, selectedSemester, gradesMap, activeMapelList]);

  const filteredRankings = useMemo(() => {
    if (!searchTerm) return rankedStudents;
    return rankedStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nisn && s.nisn.includes(searchTerm)) ||
      (s.nis && s.nis.includes(searchTerm))
    );
  }, [rankedStudents, searchTerm]);

  // Top 3 Podium
  const top1 = rankedStudents[0];
  const top2 = rankedStudents[1];
  const top3 = rankedStudents[2];

  const handleExportExcel = () => {
    if (rankedStudents.length === 0) {
      alert("Tidak ada data peringkat pada rombel ini.");
      return;
    }
    const rows = rankedStudents.map((s) => ({
      'Peringkat / Ranking': s.rank,
      'NISN / NIS': s.nisn || s.nis || '-',
      'Nama Lengkap': s.name,
      'Kelas': `Kelas ${selectedClass}`,
      'Semester': selectedSemester,
      'Rata-Rata Nilai': s.averageScore !== null ? s.averageScore : 'Belum Ada Nilai',
      'Total Skor': s.totalScore || 0,
      'Jumlah Mapel Ternilai': s.gradedSubjectsCount || 0,
      'Keterangan': s.rank === 1 ? 'Juara 1 Kelas' : s.rank === 2 ? 'Juara 2 Kelas' : s.rank === 3 ? 'Juara 3 Kelas' : '-'
    }));
    exportToExcel(rows, `Peringkat_Ranking_Kelas_${selectedClass}_${selectedSemester}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div id="printable-area" className="printable-container space-y-6 print:p-0 print:m-0 print:space-y-4 print:w-full print:bg-white text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
              <Trophy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Peringkat & Rekapitulasi Prestasi Akademik</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold flex items-center gap-1">
                  <Sparkles size={10} className="fill-amber-600" /> Logika Pintar
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Kalkulasi otomatis rerata nilai seluruh mata pelajaran, penetapan ranking rombel, dan cetak piagam bintang prestasi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
              title="Ekspor Rekap Peringkat ke Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={triggerPrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-md shadow-amber-200 transition active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak Rekap Peringkat</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <CustomDropdown
            id="ranking-select-semester"
            label="Semester Evaluasi"
            value={selectedSemester}
            onChange={(val) => setSelectedSemester(val as any)}
            options={[
              { value: 'Ganjil', label: 'Semester 1 (Ganjil)' },
              { value: 'Genap', label: 'Semester 2 (Genap)' }
            ]}
            placeholder="Pilih Semester..."
          />

          <CustomDropdown
            id="ranking-select-class"
            label="Pilih Kelas / Rombel"
            value={selectedClass}
            onChange={(val) => setSelectedClass(val)}
            options={classesList.map(c => {
              const count = students.filter(s => matchStatusActive(s.status) && matchClass(s.class, c)).length;
              return {
                value: c,
                label: formatClassLabel(c, true),
                badge: `${count} Siswa`
              };
            })}
            placeholder="Pilih Kelas..."
            searchable={classesList.length > 5}
          />

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Cari Peserta Didik:</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau NISN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Podium Top 3 */}
      {top1 && top1.averageScore !== null && top2 && top2.averageScore !== null && top3 && top3.averageScore !== null && !searchTerm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 no-print">
          {/* Juara 2 */}
          <div className="bg-gradient-to-b from-slate-100 to-white p-5 rounded-3xl border border-slate-200 shadow-xs text-center flex flex-col justify-between order-2 md:order-1 relative">
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-200 text-slate-700 font-black text-xl flex items-center justify-center border-2 border-slate-300 shadow-xs">
                2
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Peringkat II</span>
              <h3 className="font-black text-sm text-slate-900 leading-tight">{top2.name}</h3>
              <p className="text-xs font-mono font-bold text-indigo-700">Rerata: {top2.averageScore}</p>
            </div>
            <button
              onClick={() => setSelectedCertificateStudent(top2)}
              className="mt-3 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 transition"
            >
              <Award size={13} />
              <span>Piagam Prestasi</span>
            </button>
          </div>

          {/* Juara 1 */}
          <div className="bg-gradient-to-b from-amber-100/90 via-amber-50 to-white p-6 rounded-3xl border-2 border-amber-300 shadow-md text-center flex flex-col justify-between order-1 md:order-2 relative -mt-2">
            <div className="space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400 text-amber-950 font-black text-2xl flex items-center justify-center border-2 border-amber-500 shadow-md animate-bounce">
                👑 1
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                Peringkat I (Bintang Kelas)
              </span>
              <h3 className="font-black text-base text-slate-900 leading-tight">{top1.name}</h3>
              <p className="text-sm font-mono font-black text-amber-900">Rerata: {top1.averageScore}</p>
            </div>
            <button
              onClick={() => setSelectedCertificateStudent(top1)}
              className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
            >
              <Award size={14} />
              <span>Cetak Piagam Juara 1</span>
            </button>
          </div>

          {/* Juara 3 */}
          <div className="bg-gradient-to-b from-amber-50/50 to-white p-5 rounded-3xl border border-amber-200/80 shadow-xs text-center flex flex-col justify-between order-3 relative">
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-200 text-amber-900 font-black text-xl flex items-center justify-center border-2 border-amber-300 shadow-xs">
                3
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Peringkat III</span>
              <h3 className="font-black text-sm text-slate-900 leading-tight">{top3.name}</h3>
              <p className="text-xs font-mono font-bold text-indigo-700">Rerata: {top3.averageScore}</p>
            </div>
            <button
              onClick={() => setSelectedCertificateStudent(top3)}
              className="mt-3 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-1 transition"
            >
              <Award size={13} />
              <span>Piagam Prestasi</span>
            </button>
          </div>
        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-black text-slate-800">
            Daftar Peringkat Lengkap Rombel Kelas {selectedClass} - Semester {selectedSemester}
          </span>
          <span className="text-slate-500 font-mono text-[11px]">Total: {filteredRankings.length} Siswa</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                <th className="p-3 pl-4 text-center w-16">Rank</th>
                <th className="p-3 text-center">NIS / NISN</th>
                <th className="p-3">Nama Lengkap Peserta Didik</th>
                <th className="p-3 text-center">L/P</th>
                <th className="p-3 text-center">Total Nilai</th>
                <th className="p-3 text-center bg-amber-50/60 w-24">Rata-Rata</th>
                <th className="p-3 text-center">Predikat</th>
                <th className="p-3 text-center pr-4 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRankings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <p className="font-bold text-slate-600">Tidak ada data ranking untuk kelas ini.</p>
                  </td>
                </tr>
              ) : (
                filteredRankings.map((s) => (
                  <tr key={s.id} className={`hover:bg-slate-50 transition ${typeof s.rank === 'number' && s.rank <= 3 ? 'bg-amber-50/20' : ''}`}>
                    <td className="p-3 pl-4 text-center">
                      <span className={`w-8 h-8 rounded-xl font-mono font-black text-xs inline-flex items-center justify-center ${
                        s.rank === 1 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                        s.rank === 2 ? 'bg-slate-200 text-slate-800' :
                        s.rank === 3 ? 'bg-amber-200 text-amber-900' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {s.rank}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500 text-[11px]">
                      <div>{s.nis || '-'}</div>
                      <div className="text-[10px] text-slate-400">{s.nisn || '-'}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      <div>{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{formatClassLabel(s.class, true)}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        s.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {s.gender || 'L'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700">
                      {s.totalScore}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-sm text-indigo-900 bg-amber-50/40">
                      {s.averageScore}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {s.ketercapaian}
                      </span>
                    </td>
                    <td className="p-3 text-center pr-4 no-print">
                      <button
                        onClick={() => setSelectedCertificateStudent(s)}
                        className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] transition flex items-center gap-1 mx-auto"
                      >
                        <Award size={12} />
                        <span>Piagam</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Modal */}
      {selectedCertificateStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in print-modal-container">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border-4 border-amber-400 animate-in zoom-in-95 space-y-6 text-center text-slate-900 relative printable-container print-modal-content print:border-none print:shadow-none print:p-0 print:m-0">
            <button
              onClick={() => setSelectedCertificateStudent(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold no-print cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1 border-b-2 border-amber-300 pb-4">
              <span className="text-[10px] font-black tracking-widest text-amber-700 uppercase">
                {settings.schoolName || 'SD NEGERI CONTOH'}
              </span>
              <h2 className="text-2xl font-black text-amber-950 font-serif">
                PIAGAM PENGHARGAAN PRESTASI
              </h2>
              <p className="text-xs text-slate-500 font-medium">Nomor: 421.2/PP/{selectedCertificateStudent.rank}/{new Date().getFullYear()}</p>
            </div>

            <div className="space-y-3 py-2">
              <p className="text-xs text-slate-600">Diberikan kepada peserta didik berprestasi:</p>
              <h3 className="text-xl font-black text-slate-900 font-serif underline decoration-amber-400 underline-offset-4">
                {selectedCertificateStudent.name}
              </h3>
              <p className="text-xs text-slate-600">
                NISN: <span className="font-mono font-bold text-slate-800">{selectedCertificateStudent.nisn || '-'}</span> | Kelas: <span className="font-bold text-slate-800">{formatClassLabel(selectedCertificateStudent.class, true)}</span>
              </p>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 max-w-md mx-auto space-y-1">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                  Atas Prestasi Membanggakan Meraih:
                </span>
                <p className="text-base font-black text-amber-950 font-serif">
                  PERINGKAT {selectedCertificateStudent.rank} TINGKAT ROMBEL
                </p>
                <p className="text-xs font-mono font-bold text-slate-700">
                  Rata-rata Nilai: {selectedCertificateStudent.averageScore} ({selectedCertificateStudent.ketercapaian})
                </p>
              </div>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-6 pt-4 text-xs">
              <div className="space-y-12">
                <p className="text-slate-600">Wali {formatClassLabel(selectedCertificateStudent.class, true)}</p>
                <div>
                  <p className="font-bold text-slate-900 underline">{waliKelas?.name || 'Wali Kelas'}</p>
                  <p className="font-mono text-[10px] text-slate-500">NIP. {waliKelas?.nip || '-'}</p>
                </div>
              </div>
              <div className="space-y-12">
                <p className="text-slate-600">
                  Kepala Sekolah,<br />{settings.schoolName || 'SD Negeri'}
                </p>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {kepsek?.name || settings.headmasterName || 'Kepala Sekolah'}
                  </p>
                  <p className="font-mono text-[10px] text-slate-500">NIP. {kepsek?.nip || settings.headmasterNip || '-'}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3 no-print">
              <button
                onClick={() => triggerPrint()}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Printer size={15} />
                <span>Cetak Piagam Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
