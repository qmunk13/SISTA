import React, { useState } from 'react';
import {
  QrCode,
  CheckCircle2,
  Clock,
  Camera,
  Search
} from 'lucide-react';
import { Absensi, Siswa } from '../../types';

interface AbsensiModuleProps {
  siswaList: Siswa[];
  absensiList: Absensi[];
  onAddAbsensi: (absen: Absensi) => void;
}

export const AbsensiModule: React.FC<AbsensiModuleProps> = ({
  siswaList,
  absensiList,
  onAddAbsensi
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'harian' | 'scanner'>('harian');
  const [selectedKelas, setSelectedKelas] = useState<string>('KLS-10A');
  const [selectedTanggal, setSelectedTanggal] = useState<string>('2026-08-12');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Scanner state
  const [scanCode, setScanCode] = useState<string>('');
  const [scannedSiswa, setScannedSiswa] = useState<Siswa | null>(null);

  // Filtered Siswa & Absensi
  const filteredSiswa = siswaList.filter(
    (s) => (selectedKelas === 'ALL' || s.KelasID === selectedKelas) &&
      (s.NamaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) || s.NISN.includes(searchQuery))
  );

  const handleManualAbsen = (siswaID: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa') => {
    const newAbsen: Absensi = {
      AbsenID: 'ABS-' + Math.floor(1000 + Math.random() * 9000),
      Tanggal: selectedTanggal,
      SiswaID: siswaID,
      KelasID: selectedKelas,
      JamMasuk: status === 'Hadir' ? new Date().toLocaleTimeString('id-ID') : '-',
      JamPulang: status === 'Hadir' ? '15:10:00' : '-',
      Status: status,
      Keterangan: 'Input Manual Guru',
      Lokasi: 'Sekolah'
    };
    onAddAbsensi(newAbsen);
  };

  const handleScanQR = () => {
    if (!scanCode.trim()) return;
    const found = siswaList.find((s) => s.NISN === scanCode.trim() || s.SiswaID === scanCode.trim());
    if (found) {
      setScannedSiswa(found);
      const newAbsen: Absensi = {
        AbsenID: 'ABS-' + Math.floor(1000 + Math.random() * 9000),
        Tanggal: selectedTanggal,
        SiswaID: found.SiswaID,
        KelasID: found.KelasID,
        JamMasuk: new Date().toLocaleTimeString('id-ID'),
        JamPulang: '15:10:00',
        Status: 'Hadir',
        Keterangan: 'QR Scan Instant Verified',
        Lokasi: 'Gerbang Utama'
      };
      onAddAbsensi(newAbsen);
    } else {
      setScannedSiswa(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('harian')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'harian'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Presensi Kehadiran Siswa
          </button>
          <button
            onClick={() => setActiveSubTab('scanner')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'scanner'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Simulasi Scanner QR Code
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Tanggal:</span>
          <input
            type="date"
            value={selectedTanggal}
            onChange={(e) => setSelectedTanggal(e.target.value)}
            className="text-xs font-semibold bg-transparent text-slate-700 outline-none"
          />
        </div>
      </div>

      {/* SubTab 1: Presensi Harian */}
      {activeSubTab === 'harian' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="bg-white border border-slate-300 text-xs font-semibold text-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Kelas</option>
                  <option value="KLS-10A">X PPLG 1</option>
                  <option value="KLS-10B">X TKT 1</option>
                  <option value="KLS-11A">XI PPLG 1</option>
                  <option value="KLS-12A">XII PPLG 1</option>
                </select>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari siswa atau NISN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs font-medium rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Total: <strong className="text-slate-900">{filteredSiswa.length} Siswa</strong></span>
              </div>
            </div>

            {/* Table Siswa */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Siswa</th>
                    <th className="p-3">NISN / Kelas</th>
                    <th className="p-3">Jam Masuk</th>
                    <th className="p-3">Status Hari Ini</th>
                    <th className="p-3 text-center">Tandai Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSiswa.map((s) => {
                    const statusAbsen = absensiList.find(
                      (a) => a.SiswaID === s.SiswaID && a.Tanggal === selectedTanggal
                    );

                    return (
                      <tr key={s.SiswaID} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800 flex items-center gap-3">
                          <img
                            src={s.Foto || 'https://via.placeholder.com/40'}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            alt={s.NamaLengkap}
                          />
                          <div>
                            <p className="text-slate-900">{s.NamaLengkap}</p>
                            <p className="text-[10px] text-slate-400 font-normal">{s.Email}</p>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {s.NISN}
                          <span className="ml-2 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-sans text-[10px] font-bold">
                            {s.KelasID}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {statusAbsen?.JamMasuk || '-'}
                        </td>
                        <td className="p-3">
                          {statusAbsen ? (
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                statusAbsen.Status === 'Hadir'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : statusAbsen.Status === 'Sakit'
                                  ? 'bg-amber-100 text-amber-800'
                                  : statusAbsen.Status === 'Izin'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {statusAbsen.Status}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">Belum Absen</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleManualAbsen(s.SiswaID, 'Hadir')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold transition-colors"
                            >
                              ✓ Hadir
                            </button>
                            <button
                              onClick={() => handleManualAbsen(s.SiswaID, 'Izin')}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 rounded-md text-[10px] font-semibold transition-colors"
                            >
                              Izin
                            </button>
                            <button
                              onClick={() => handleManualAbsen(s.SiswaID, 'Sakit')}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 border border-amber-200 rounded-md text-[10px] font-semibold transition-colors"
                            >
                              Sakit
                            </button>
                            <button
                              onClick={() => handleManualAbsen(s.SiswaID, 'Alpa')}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-md text-[10px] font-semibold transition-colors"
                            >
                              Alpa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: Scanner Simulator */}
      {activeSubTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Simulasi QR Code Scanner</h3>
                <p className="text-xs text-slate-500">Scan QR Code NISN siswa untuk mencatat kehadiran otomatis</p>
              </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-xl text-center text-white space-y-4">
              <div className="w-32 h-32 mx-auto bg-white/10 rounded-xl border-2 border-dashed border-indigo-400 flex items-center justify-center text-indigo-300">
                <QrCode className="w-16 h-16 animate-pulse" />
              </div>
              <p className="text-xs text-slate-300">Ketik NISN Siswa di bawah untuk mensimulasikan hasil Scan QR Kamera:</p>

              <div className="flex items-center gap-2 max-w-xs mx-auto">
                <input
                  type="text"
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  placeholder="NISN Contoh: 0061234567"
                  className="flex-1 bg-black/40 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg font-mono focus:border-indigo-400 outline-none"
                />
                <button
                  onClick={handleScanQR}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Scan QR
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-4">Hasil Scan Presensi</h3>
              {scannedSiswa ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-900 text-xs">{scannedSiswa.NamaLengkap}</h4>
                      <p className="text-[11px] text-emerald-700">NISN: {scannedSiswa.NISN} | Kelas: {scannedSiswa.KelasID}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-semibold bg-white/80 p-2 rounded-lg border border-emerald-100">
                    ✓ Kehadiran berhasil dicatat pada jam {new Date().toLocaleTimeString('id-ID')} (Tepat Waktu).
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                  Belum ada siswa yang discan. Ketik NISN di sebelah kiri.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
              <p className="font-bold text-slate-700 mb-1">Daftar NISN Sampel untuk Testing:</p>
              <ul className="list-disc pl-4 space-y-1">
                {siswaList.map((s) => (
                  <li key={s.SiswaID} className="font-mono">
                    {s.NISN} - {s.NamaLengkap} ({s.KelasID})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
