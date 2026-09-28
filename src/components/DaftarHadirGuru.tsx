import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  Camera,
  X,
  Send,
  UserCheck,
  Check,
  Search,
  LogIn,
  LogOut,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { User, Siswa, AbsensiRecord } from '../types';
import {
  getSiswaList, getKelasList, getTodayDateString, recordScanAbsensi,
  getAbsensiRecords, updateAbsensiStatus
} from '../lib/storage';

interface DaftarHadirGuruProps {
  currentUser: User;
}

export const DaftarHadirGuru: React.FC<DaftarHadirGuruProps> = ({ currentUser }) => {
  const [mode, setMode] = useState<'masuk' | 'pulang'>('masuk');
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [selectedTanggal, setSelectedTanggal] = useState<string>(getTodayDateString());
  const [statusMap, setStatusMap] = useState<Record<string, 'Hadir' | 'Sakit' | 'Izin' | 'Alpa'>>({});
  const [manualNisn, setManualNisn] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const availableClasses = getKelasList();
  
  // Initialize default selected class
  useEffect(() => {
    if (currentUser.role === 'guru' && currentUser.kelas) {
      const guruClasses = currentUser.kelas.split(',').map(k => k.trim());
      if (guruClasses.length > 0) setSelectedKelas(guruClasses[0]);
    } else if (availableClasses.length > 0 && !selectedKelas) {
      setSelectedKelas(availableClasses[0]);
    }
  }, [currentUser]);

  const studentList = getSiswaList(selectedKelas);
  const todayRecords = getAbsensiRecords().filter(r => r.tanggal === selectedTanggal && r.kelas === selectedKelas);

  // Sync existing attendance data into statusMap
  useEffect(() => {
    const newMap: Record<string, 'Hadir' | 'Sakit' | 'Izin' | 'Alpa'> = {};
    studentList.forEach(s => {
      const found = todayRecords.find(r => r.nisn.replace(/[^a-zA-Z0-9]/g, '') === s.nisn.replace(/[^a-zA-Z0-9]/g, ''));
      if (found && found.status !== 'Belum Absen') {
        newMap[s.nisn] = found.status as 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
      }
    });
    setStatusMap(newMap);
  }, [selectedKelas, selectedTanggal]);

  const handleSetStatus = (nisn: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    setStatusMap(prev => {
      if (prev[nisn] === status) {
        const copy = { ...prev };
        delete copy[nisn];
        return copy;
      }
      return { ...prev, [nisn]: status };
    });
  };

  const handleMarkAllHadir = () => {
    const updated: Record<string, 'Hadir' | 'Sakit' | 'Izin' | 'Alpa'> = {};
    studentList.forEach(s => {
      updated[s.nisn] = 'Hadir';
    });
    setStatusMap(updated);
  };

  const handleManualNisnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNisn.trim()) return;

    const res = recordScanAbsensi(manualNisn.trim(), currentUser.role, currentUser.kelas);
    setScanMessage({ text: res.message, success: res.success });
    setTimeout(() => setScanMessage(null), 3000);

    if (res.success) {
      const clean = manualNisn.trim().replace(/[^a-zA-Z0-9]/g, '');
      const s = studentList.find(st => st.nisn.replace(/[^a-zA-Z0-9]/g, '') === clean);
      if (s) {
        setStatusMap(prev => ({ ...prev, [s.nisn]: 'Hadir' }));
      }
    }
    setManualNisn('');
  };

  const handleSubmitAll = () => {
    const entries = Object.entries(statusMap);
    if (entries.length === 0) return;

    entries.forEach(([nisn, status]) => {
      updateAbsensiStatus(nisn, selectedTanggal, status as any);
    });

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const isGuru = currentUser.role === 'guru';
  const allowedClasses = isGuru && currentUser.kelas ? currentUser.kelas.split(',').map(k => k.trim()) : availableClasses;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mode Toggle Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Daftar Hadir & Scanner Kelas</h2>
            <p className="text-xs text-slate-500 mt-0.5">Pengisian presensi siswa langsung via QR Code atau penandaan status manual.</p>
          </div>

          {/* Mode Switcher Slider */}
          <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setMode('masuk')}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'masuk' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Absen Masuk</span>
            </button>
            <button
              onClick={() => setMode('pulang')}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'pulang' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Absen Pulang</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Kelas</label>
            <select
              value={selectedKelas}
              onChange={e => setSelectedKelas(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            >
              {allowedClasses.map(c => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal</label>
            <input
              type="date"
              value={selectedTanggal}
              onChange={e => setSelectedTanggal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="sm:col-span-4 flex items-end justify-between gap-2">
            <div className="text-xs text-slate-500">
              Terisi: <span className="font-bold text-indigo-600">{Object.keys(statusMap).length} / {studentList.length}</span>
            </div>
            <button
              onClick={handleSubmitAll}
              disabled={Object.keys(statusMap).length === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs ${
                Object.keys(statusMap).length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Absensi</span>
            </button>
          </div>
        </div>
      </div>

      {submitted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Data presensi kelas {selectedKelas} berhasil disimpan ke database!</span>
        </div>
      )}

      {/* Main Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Student Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-white">Daftar Hadir Siswa - Kelas {selectedKelas}</h3>
                <p className="text-[10px] text-slate-300">Tandai status atau gunakan scan QR</p>
              </div>
            </div>
            <button
              onClick={handleMarkAllHadir}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 transition cursor-pointer"
            >
              ✓ Tandai Semua Hadir
            </button>
          </div>

          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-3 py-3 text-center">Status Presensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-400 font-semibold">
                      Tidak ada siswa ditemukan di kelas {selectedKelas}
                    </td>
                  </tr>
                ) : (
                  studentList.map((s, idx) => {
                    const st = statusMap[s.nisn];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800 text-xs">{s.nama}</div>
                          <div className="text-[10px] font-mono text-slate-400">{s.nisn}</div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center gap-1.5 flex-wrap">
                            {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map(status => {
                              const isActive = st === status;
                              const colors = {
                                Hadir: isActive ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                Sakit: isActive ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                Izin: isActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                Alpa: isActive ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              };

                              return (
                                <button
                                  key={status}
                                  onClick={() => handleSetStatus(s.nisn, status)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${colors[status]}`}
                                >
                                  {isActive ? `✓ ${status}` : status}
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
        </div>

        {/* Right: Scanner & Manual NISN Input */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-4 text-white text-center">
              <Camera className="w-8 h-8 mx-auto mb-1 text-purple-200" />
              <h3 className="font-bold text-xs sm:text-sm">Scan QR Presensi Siswa</h3>
              <p className="text-[10px] text-purple-200 mt-0.5">Scan langsung otomatis tandai Hadir</p>
            </div>

            <div className="p-4 space-y-3">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Kamera Live Scanner</span>
              </button>

              {scanMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center border ${
                  scanMessage.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {scanMessage.text}
                </div>
              )}

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[9px] font-bold uppercase text-slate-400">atau</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              <form onSubmit={handleManualNisnSubmit} className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Input NISN Manual</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualNisn}
                    onChange={e => setManualNisn(e.target.value)}
                    placeholder="Ketik NISN..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cek
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Status Legend Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Keterangan Warna Status</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span className="font-semibold text-slate-700">Hadir</span> - Mengikuti KBM</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span className="font-semibold text-slate-700">Sakit</span> - Surat dokter/orang tua</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span><span className="font-semibold text-slate-700">Izin</span> - Keperluan khusus</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span className="font-semibold text-slate-700">Alpa</span> - Tanpa keterangan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Live Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 text-white rounded-2xl p-6 max-w-sm w-full relative border border-slate-800 shadow-2xl">
            <button
              onClick={() => setIsScannerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <Camera className="w-8 h-8 text-indigo-400 mx-auto mb-1 animate-pulse" />
              <h3 className="font-bold text-sm">Kamera QR Live Active</h3>
              <p className="text-[10px] text-slate-400">Arahkan QR Code Kartu Pelajar ke kamera</p>
            </div>

            <div className="relative bg-black rounded-xl overflow-hidden h-64 border border-slate-800 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-indigo-500/50 rounded-xl pointer-events-none"></div>
              <div className="w-48 h-48 border-2 border-indigo-400 rounded-lg relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-indigo-500 absolute animate-pulse"></div>
                <span className="text-[10px] text-slate-400">Posisikan QR di dalam kotak</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => {
                  // Simulate rapid test scan
                  if (studentList.length > 0) {
                    const randomSiswa = studentList[Math.floor(Math.random() * studentList.length)];
                    recordScanAbsensi(randomSiswa.nisn, currentUser.role, currentUser.kelas);
                    setStatusMap(prev => ({ ...prev, [randomSiswa.nisn]: 'Hadir' }));
                    setScanMessage({ text: `QR ${randomSiswa.nama} terdeteksi! (Hadir)`, success: true });
                  }
                  setIsScannerOpen(false);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition"
              >
                Simulasi Scan Terdeteksi (Test)
              </button>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="w-full py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs"
              >
                Tutup Kamera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
