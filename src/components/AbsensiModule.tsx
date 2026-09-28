import React, { useState } from 'react';
import { 
  QrCode, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Camera, 
  Sparkles, 
  CalendarOff, 
  UserCheck, 
  Check, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { UserSession } from '../types/schema';

interface AbsensiModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeSubTab?: string;
}

export const AbsensiModule: React.FC<AbsensiModuleProps> = ({ userSession, dbData, setDbData, activeSubTab: activeSubTabProp }) => {
  const [activeSubTab, setActiveSubTab] = useState<'scan' | 'daftar_hadir' | 'libur'>('daftar_hadir');

  React.useEffect(() => {
    if (activeSubTabProp) {
      if (activeSubTabProp === 'qr_scanner') setActiveSubTab('scan');
      else if (activeSubTabProp === 'libur') setActiveSubTab('libur');
      else setActiveSubTab('daftar_hadir');
    }
  }, [activeSubTabProp]);
  const [selectedKelas, setSelectedKelas] = useState<string>('10-A');
  const [selectedTanggal, setSelectedTanggal] = useState<string>('2026-07-26');
  const [modeAbsen, setModeAbsen] = useState<'masuk' | 'pulang'>('masuk');
  const [scanNisn, setScanNisn] = useState<string>('');

  const siswaList = (dbData['SISWA'] || []).filter(s => {
    if (!selectedKelas || selectedKelas === 'SEMUA') return true;
    const sClass = (s['Kelas Saat ini'] || s['kelasId'] || s['kelas'] || s['Kelas'] || '').toString().trim();
    if (!sClass) return true;
    return sClass.toLowerCase() === selectedKelas.toLowerCase() ||
           sClass.toLowerCase().includes(selectedKelas.toLowerCase()) ||
           selectedKelas.toLowerCase().includes(sClass.toLowerCase());
  });
  const absensiRecords = dbData['ABSENSI'] || [];

  const handleMarkStatus = (nopdkt: string, status: string) => {
    const today = selectedTanggal;
    const nowTime = new Date().toLocaleTimeString('id-ID');

    setDbData(prev => {
      const currentAbsensi = [...(prev['ABSENSI'] || [])];
      const existingIdx = currentAbsensi.findIndex(a => a.nopdkt === nopdkt && a.tanggal === today);

      if (existingIdx >= 0) {
        if (modeAbsen === 'masuk') {
          currentAbsensi[existingIdx].status = status;
          currentAbsensi[existingIdx].keterangan = status === 'Hadir' ? 'Tepat Waktu' : status;
        } else {
          currentAbsensi[existingIdx].JamPulang = nowTime;
        }
      } else {
        currentAbsensi.push({
          id_Absensi: `ABS-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          tanggal: today,
          nopdkt: nopdkt,
          kelasId: selectedKelas,
          jamDatang: nowTime,
          JamPulang: modeAbsen === 'pulang' ? nowTime : '',
          keterangan: status === 'Hadir' ? 'Tepat Waktu' : status,
          status: status,
          latitude: '-6.1382',
          longitude: '106.8041',
          jarakSekolah: '0.1 km',
          buktiFoto: '',
          catatanIzin: '',
          'longitude 2': ''
        });
      }

      return { ...prev, ABSENSI: currentAbsensi };
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/60 border border-slate-200 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('daftar_hadir')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'daftar_hadir' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Daftar Hadir Guru
        </button>
        <button
          onClick={() => setActiveSubTab('scan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'scan' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" /> Scan QR Live
        </button>
        <button
          onClick={() => setActiveSubTab('libur')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'libur' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarOff className="w-4 h-4" /> Kalender Libur
        </button>
      </div>

      {/* SUBTAB 1: DAFTAR HADIR GURU */}
      {activeSubTab === 'daftar_hadir' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModeAbsen('masuk')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  modeAbsen === 'masuk' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Absen Masuk
              </button>
              <button
                onClick={() => setModeAbsen('pulang')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  modeAbsen === 'pulang' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Absen Pulang
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex-1 md:flex-initial">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kelas</label>
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none shadow-sm"
                >
                  <option value="SEMUA">Semua Kelas</option>
                  {(dbData['KELAS'] || []).map(k => (
                    <option key={k.id || k.nama} value={k.nama || k.id}>{k.nama || k.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tanggal</label>
                <input
                  type="date"
                  value={selectedTanggal}
                  onChange={(e) => setSelectedTanggal(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Student List Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">NISN / PDKT</th>
                  <th className="p-4 text-center">Jam Datang</th>
                  <th className="p-4 text-center">Jam Pulang</th>
                  <th className="p-4 text-center">Status / Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {siswaList.map((s, idx) => {
                  const rec = absensiRecords.find(a => a.nopdkt === s.nopdkt && a.tanggal === selectedTanggal);
                  const currentStatus = rec?.status || 'Belum Absen';

                  return (
                    <tr key={s.nopdkt} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-bold text-slate-800">{s['Nama Lengkap']}</td>
                      <td className="p-4 font-mono text-blue-600">{s.NISN}</td>
                      <td className="p-4 text-center font-mono text-slate-600">{rec?.jamDatang || '-'}</td>
                      <td className="p-4 text-center font-mono text-slate-600">{rec?.JamPulang || '-'}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {['Hadir', 'Sakit', 'Izin', 'Alpa'].map((st) => (
                            <button
                              key={st}
                              onClick={() => handleMarkStatus(s.nopdkt, st)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                currentStatus === st
                                  ? st === 'Hadir' ? 'bg-emerald-600 text-white' : st === 'Sakit' ? 'bg-amber-600 text-white' : st === 'Izin' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: SCAN QR LIVE */}
      {activeSubTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-2xl mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Simulasi Live Camera Scanner</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Scan QR Code kartu pelajar siswa secara instan tanpa perlu mengetik manual.
            </p>

            <div className="my-6 w-full max-w-xs bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-blue-300 relative group">
              <QrCode className="w-32 h-32 mx-auto text-blue-600 group-hover:scale-105 transition" />
              <div className="mt-3 text-[10px] font-mono text-slate-500">Arahkan Kamera ke QR Code</div>
            </div>

            <div className="w-full space-y-3">
              <label className="text-xs font-bold text-slate-600 block text-left">Input Manual NISN / PDKT:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanNisn}
                  onChange={(e) => setScanNisn(e.target.value)}
                  placeholder="Ketik 3122140501..."
                  className="flex-1 bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => {
                    const found = (dbData['SISWA'] || []).find(s => s.NISN === scanNisn || s.nopdkt === scanNisn);
                    if (found) {
                      handleMarkStatus(found.nopdkt, 'Hadir');
                      setScanNisn('');
                      alert(`Berhasil Presensi Hadir: ${found['Nama Lengkap']}`);
                    } else {
                      alert('Siswa tidak ditemukan dengan NISN tersebut!');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  Proses
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> Log Pemindaian Terakhir (QR_LOG)
            </h3>

            <div className="space-y-3 max-h-[380px] overflow-y-auto">
              {(dbData['ABSENSI'] || []).map((abs, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{abs.nopdkt}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{abs.jamDatang} • {abs.status}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    SUCCESS
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: HARI LIBUR */}
      {activeSubTab === 'libur' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Pengaturan Kalender & Hari Libur</h3>
              <p className="text-xs text-slate-500">Atur tanggal merah dan masa libur sekolah.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-slate-700 uppercase">Tambah Hari Libur Baru</h4>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tanggal</label>
                <input type="date" className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Hari Libur</label>
                <input type="text" placeholder="Contoh: Maulid Nabi / Libur Semester" className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none shadow-sm" />
              </div>
              <button className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition">
                Simpan Tanggal Merah
              </button>
            </div>

            <div className="lg:col-span-2 space-y-3">
              {(dbData['HARI_LIBUR'] || [
                { Tanggal: '2026-08-17', Nama: 'HUT Kemerdekaan RI', Jenis: 'Nasional' },
                { Tanggal: '2026-12-25', Hari: 'Hari Natal', Jenis: 'Nasional' }
              ]).map((lib, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800">{lib.Nama}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{lib.Tanggal} • {lib.Jenis || 'Libur Sekolah'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                    LIBUR
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
