import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  HelpCircle, 
  Calendar, 
  KeyRound, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Award,
  Sparkles
} from 'lucide-react';
import { UserSession } from '../types/schema';

interface CbtModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeSubTab?: string;
}

export const CbtModule: React.FC<CbtModuleProps> = ({ userSession, dbData, setDbData, activeSubTab: activeSubTabProp }) => {
  const [activeSubTab, setActiveSubTab] = useState<'bank_soal' | 'jadwal' | 'simulasi_cbt' | 'hasil'>('jadwal');

  useEffect(() => {
    if (activeSubTabProp) {
      if (activeSubTabProp === 'bank_soal') setActiveSubTab('bank_soal');
      else if (activeSubTabProp === 'simulasi_cbt') setActiveSubTab('simulasi_cbt');
      else if (activeSubTabProp === 'hasil') setActiveSubTab('hasil');
      else setActiveSubTab('jadwal');
    }
  }, [activeSubTabProp]);
  
  // Simulation State
  const [tokenInput, setTokenInput] = useState('');
  const [isExamLive, setIsExamLive] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [violationsCount, setViolationsCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [finalScoreResult, setFinalScoreResult] = useState<any | null>(null);

  const bankSoalList = dbData['BANK_SOAL'] || [];
  const jadwalList = dbData['UJIAN'] || [];
  const hasilList = dbData['HASIL_UJIAN'] || [];

  // Handle Tab Blur Anti-Cheat Violation
  useEffect(() => {
    if (!isExamLive || examSubmitted) return;

    const handleBlur = () => {
      setViolationsCount(prev => {
        const next = prev + 1;
        if (next >= 3) {
          alert('Peringatan! Pelanggaran telah mencapai batas maksimal (3x). Ujian akan disubmit otomatis.');
          handleFinishExam();
        } else {
          alert(`Peringatan Anti-Curang! Anda dideteksi meninggalkan halaman ujian (${next}/3x).`);
        }
        return next;
      });
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [isExamLive, examSubmitted]);

  // Timer countdown
  useEffect(() => {
    if (!isExamLive || examSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamLive, examSubmitted]);

  const handleStartExam = () => {
    if (tokenInput !== 'KTCT26') {
      alert('Token Ujian Salah! Masukkan Token KTCT26');
      return;
    }
    setIsExamLive(true);
    setExamSubmitted(false);
    setSelectedAnswers({});
    setViolationsCount(0);
    setTimeLeft(1800);
  };

  const handleFinishExam = () => {
    setIsExamLive(false);
    setExamSubmitted(true);

    let benar = 0;
    let total = bankSoalList.length;

    bankSoalList.forEach((s, idx) => {
      if (selectedAnswers[idx] === s.kunci) {
        benar++;
      }
    });

    const nilaiMentah = total > 0 ? Math.round((benar / total) * 100) : 0;
    const penalti = violationsCount * 5;
    const nilaiAkhir = Math.max(0, nilaiMentah - penalti);
    const status = nilaiAkhir >= 65 ? '✅ LULUS' : '❌ TIDAK TUNTAS';

    const resultObj = {
      ID_HASIL: `HSL-${Date.now()}`,
      idAsesmen: 'AS-01',
      ID_UJIAN: 'UJ-001',
      JENJANG: 'SMA',
      KELAS: '10-A',
      MAPEL: 'Matematika',
      NISN: userSession.username,
      NAMA_SISWA: userSession.name,
      NILAI: nilaiMentah,
      BENAR: benar,
      SALAH: total - benar,
      TOTAL_SOAL: total,
      PELANGGARAN: violationsCount,
      WAKTU_MULAI: new Date().toISOString(),
      STATUS: status,
      TAHUN_AJARAN: '2025/2026',
      NILAI_AKHIR: nilaiAkhir,
      WAKTU_SELESAI: new Date().toISOString(),
      DURASI: '30 Menit',
      ID_JADWAL: 'JDW-001'
    };

    setFinalScoreResult(resultObj);

    setDbData(prev => ({
      ...prev,
      HASIL_UJIAN: [resultObj, ...(prev['HASIL_UJIAN'] || [])]
    }));
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/60 border border-slate-200 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('jadwal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'jadwal' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" /> Jadwal & Token Ujian
        </button>
        <button
          onClick={() => setActiveSubTab('bank_soal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'bank_soal' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Bank Soal
        </button>
        <button
          onClick={() => setActiveSubTab('simulasi_cbt')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'simulasi_cbt' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Play className="w-4 h-4" /> Ruang Ujian Live CBT
        </button>
        <button
          onClick={() => setActiveSubTab('hasil')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'hasil' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" /> Hasil & Skor
        </button>
      </div>

      {/* TAB 1: JADWAL & TOKEN */}
      {activeSubTab === 'jadwal' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Jadwal Pelaksanaan Ujian (JADWAL & UJIAN)</h3>
              <p className="text-xs text-slate-500">Token aktif dan status kesiapan ujian</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jadwalList.map((j, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-sm text-blue-600">{j.mapel}</h4>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">
                    {j.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p>Kelas: <span className="font-bold text-slate-800">{j.kelas}</span></p>
                  <p>Tanggal: <span className="font-bold text-slate-800">{j.tanggal}</span></p>
                  <p>Waktu: <span className="font-bold text-slate-800">{j.jamMulai} - {j.jamSelesai}</span></p>
                  <p>Durasi: <span className="font-bold text-slate-800">{j.durasi} Menit</span></p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-500">Token:</span>
                    <span className="font-mono font-black text-amber-600 tracking-wider text-sm">{j.token}</span>
                  </div>
                  <button
                    onClick={() => {
                      setTokenInput(j.token);
                      setActiveSubTab('simulasi_cbt');
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Ikut Ujian →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BANK SOAL */}
      {activeSubTab === 'bank_soal' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base">Master Bank Soal Ujian (BANK_SOAL)</h3>

          <div className="space-y-4">
            {bankSoalList.map((s, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-blue-600">Soal No. {idx + 1} ({s.mapel})</span>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Bobot: {s.bobot}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">{s.soal}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={`p-2.5 rounded-xl border ${s.kunci === 'A' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                    A. {s.a}
                  </div>
                  <div className={`p-2.5 rounded-xl border ${s.kunci === 'B' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                    B. {s.b}
                  </div>
                  <div className={`p-2.5 rounded-xl border ${s.kunci === 'C' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                    C. {s.c}
                  </div>
                  <div className={`p-2.5 rounded-xl border ${s.kunci === 'D' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                    D. {s.d}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SIMULASI RUANG UJIAN LIVE */}
      {activeSubTab === 'simulasi_cbt' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto space-y-6">
          {!isExamLive && !examSubmitted && (
            <div className="text-center space-y-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-2xl">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Konfirmasi Token Masuk Ujian CBT</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sistem dilengkapi fitur anti-kecurangan. Meninggalkan tab browser atau berpindah aplikasi akan dicatat sebagai pelanggaran.
              </p>
              <div className="max-w-xs mx-auto space-y-3">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Masukkan Token: KTCT26"
                  className="w-full bg-slate-50 border border-slate-200 text-center font-mono font-bold text-amber-600 rounded-xl p-3 text-sm outline-none focus:border-blue-500 shadow-sm"
                />
                <button
                  onClick={handleStartExam}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
                >
                  Mulai Ujian Sekarang
                </button>
              </div>
            </div>
          )}

          {isExamLive && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Exam Status */}
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 sticky top-20 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Peserta: {userSession.name}</p>
                    <p className="text-xs font-bold text-blue-600">NISN: {userSession.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Pelanggaran: {violationsCount}/3</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-mono font-black text-blue-700">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatTimer(timeLeft)}</span>
                  </div>
                </div>
              </div>

              {/* Soal List */}
              <div className="space-y-6">
                {bankSoalList.map((s, idx) => (
                  <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <p className="text-xs font-bold text-blue-600">Soal No. {idx + 1}</p>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed">{s.soal}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['A', 'B', 'C', 'D'].map(option => {
                        const optionText = option === 'A' ? s.a : option === 'B' ? s.b : option === 'C' ? s.c : s.d;
                        const isSelected = selectedAnswers[idx] === option;

                        return (
                          <button
                            key={option}
                            onClick={() => setSelectedAnswers(prev => ({ ...prev, [idx]: option }))}
                            className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="font-bold me-2">{option}.</span> {optionText}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleFinishExam}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition"
              >
                Submit Jawaban Ujian
              </button>
            </div>
          )}

          {examSubmitted && finalScoreResult && (
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Ujian Selesai Dilaksanakan!</h3>
              <p className="text-xs text-slate-500">Hasil nilai dan evaluasi kualitatif otomatis tersimpan ke Sheet HASIL_UJIAN</p>

              <div className="p-4 bg-white rounded-xl border border-slate-200 max-w-sm mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between"><span>Nama Siswa:</span><span className="font-bold text-slate-800">{finalScoreResult.NAMA_SISWA}</span></div>
                <div className="flex justify-between"><span>Nilai Mentah:</span><span className="font-bold text-slate-600">{finalScoreResult.NILAI}</span></div>
                <div className="flex justify-between"><span>Pelanggaran:</span><span className="font-bold text-rose-600">{finalScoreResult.PELANGGARAN}x</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-2"><span className="font-bold">Nilai Akhir:</span><span className="font-extrabold text-emerald-600 text-base">{finalScoreResult.NILAI_AKHIR}</span></div>
                <div className="flex justify-between"><span className="font-bold">Status:</span><span className="font-bold text-blue-600">{finalScoreResult.STATUS}</span></div>
              </div>

              <button
                onClick={() => {
                  setExamSubmitted(false);
                  setActiveSubTab('hasil');
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Lihat Rekap Hasil
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HASIL UJIAN */}
      {activeSubTab === 'hasil' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base">Rekapitulasi Hasil Ujian Siswa (HASIL_UJIAN)</h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-4">ID Hasil</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Mapel</th>
                  <th className="p-4 text-center">Benar / Salah</th>
                  <th className="p-4 text-center">Nilai Akhir</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {hasilList.map((h, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono text-blue-600 font-bold">{h.ID_HASIL}</td>
                    <td className="p-4 font-bold text-slate-800">{h.NAMA_SISWA} ({h.KELAS})</td>
                    <td className="p-4 text-slate-600">{h.MAPEL}</td>
                    <td className="p-4 text-center font-mono">{h.BENAR} / {h.SALAH}</td>
                    <td className="p-4 text-center font-extrabold text-emerald-600 text-sm">{h.NILAI_AKHIR}</td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        {h.STATUS}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
