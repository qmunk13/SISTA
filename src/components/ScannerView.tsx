import React, { useState } from 'react';
import {
  QrCode,
  Camera,
  Upload,
  CheckCircle2,
  Trash2,
  Send,
  ArrowLeft,
  AlertCircle,
  Plus
} from 'lucide-react';
import { User } from '../types';
import { recordScanAbsensi, getSiswaByNisn } from '../lib/storage';

interface ScannerViewProps {
  currentUser: User;
  onBack: () => void;
}

interface ScanQueueItem {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  time: string;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ currentUser, onBack }) => {
  const [queue, setQueue] = useState<ScanQueueItem[]>([]);
  const [manualNisn, setManualNisn] = useState<string>('');
  const [scanMessage, setScanMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const handleAddNisn = (rawNisn: string) => {
    const nisnClean = rawNisn.replace(/[^a-zA-Z0-9]/g, '').trim();
    if (!nisnClean) return;

    if (queue.some(q => q.nisn === nisnClean)) {
      setScanMessage({ text: `NISN ${nisnClean} sudah ada di dalam antrian!`, success: false });
      setTimeout(() => setScanMessage(null), 3000);
      return;
    }

    const siswa = getSiswaByNisn(nisnClean);
    if (!siswa) {
      setScanMessage({ text: `NISN [${nisnClean}] tidak terdaftar di database.`, success: false });
      setTimeout(() => setScanMessage(null), 3000);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });

    setQueue(prev => [
      ...prev,
      {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        nisn: siswa.nisn,
        nama: siswa.nama,
        kelas: siswa.kelas,
        time: timeStr
      }
    ]);

    setScanMessage({ text: `✓ ${siswa.nama} (${siswa.kelas}) ditambahkan ke antrian!`, success: true });
    setTimeout(() => setScanMessage(null), 3000);
    setManualNisn('');
  };

  const handleRemoveItem = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  const handleClearQueue = () => {
    setQueue([]);
  };

  const handleSubmitBatch = () => {
    if (queue.length === 0) return;

    let successCount = 0;
    queue.forEach(item => {
      const res = recordScanAbsensi(item.nisn, currentUser.role, currentUser.kelas);
      if (res.success) successCount++;
    });

    setScanMessage({ text: `Kolektif Selesai! ${successCount} dari ${queue.length} presensi berhasil tersimpan.`, success: true });
    setQueue([]);
    setTimeout(() => setScanMessage(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Simulate reading QR code from uploaded image file
      const simulatedNisn = '100123456' + (Math.floor(Math.random() * 5) + 1);
      handleAddNisn(simulatedNisn);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Scanner QR Code Presensi</h2>
            <p className="text-xs text-slate-500 mt-0.5">Scan beberapa siswa sekaligus → Kirim kolektif ke database.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Options */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 text-white text-center">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-2">
                <QrCode className="w-5 h-5 text-indigo-300" />
              </div>
              <h3 className="font-bold text-sm">Pilih Metode Scan QR</h3>
              <p className="text-[10px] text-slate-300 mt-0.5">Mendukung kamera live, upload foto QR, atau ketik NISN</p>
            </div>

            <div className="p-4 space-y-3">
              {/* Option 1: Live Camera Modal */}
              <button
                onClick={() => setIsCameraActive(!isCameraActive)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>{isCameraActive ? 'Tutup Kamera Live' : 'Buka Kamera Live Scanner'}</span>
              </button>

              {isCameraActive && (
                <div className="p-4 bg-slate-900 text-white rounded-xl text-center border border-slate-800 space-y-3">
                  <div className="w-40 h-40 border-2 border-indigo-400 rounded-lg mx-auto flex items-center justify-center relative bg-black/50">
                    <div className="w-full h-0.5 bg-indigo-500 absolute animate-pulse"></div>
                    <span className="text-[10px] text-slate-400">Scan QR Code Siswa</span>
                  </div>
                  <button
                    onClick={() => {
                      const testNisns = ['1001234561', '1001234562', '1001234563', '1001234564', '1101234561'];
                      const picked = testNisns[Math.floor(Math.random() * testNisns.length)];
                      handleAddNisn(picked);
                    }}
                    className="py-1.5 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 rounded-lg text-[10px] font-bold"
                  >
                    + Simulasi Scan Terdeteksi
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[9px] font-bold uppercase text-slate-400">atau</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Option 2: Upload File */}
              <label className="block w-full cursor-pointer">
                <div className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Pilih File Foto QR Code</span>
                </div>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[9px] font-bold uppercase text-slate-400">atau</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Option 3: Manual NISN */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddNisn(manualNisn);
                }}
                className="space-y-2"
              >
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Input NISN Manual</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualNisn}
                    onChange={e => setManualNisn(e.target.value)}
                    placeholder="Ketik NISN (e.g. 1001234561)..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {scanMessage && (
            <div className={`p-3.5 rounded-xl text-xs font-bold text-center border ${
              scanMessage.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {scanMessage.text}
            </div>
          )}

          {/* Batch Submit Button */}
          <button
            onClick={handleSubmitBatch}
            disabled={queue.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
              queue.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Kirim Absensi Kolektif ({queue.length} Siswa)</span>
          </button>
        </div>

        {/* Right Column: Queue Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[420px]">
          <div className="p-4 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-white">Antrian Hasil Scan ({queue.length} Siswa)</h3>
                <p className="text-[10px] text-emerald-100">Periksa daftar sebelum menekan Kirim Kolektif</p>
              </div>
            </div>

            {queue.length > 0 && (
              <button
                onClick={handleClearQueue}
                className="text-xs text-white/80 hover:text-white flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-3 py-3 text-center">Kelas</th>
                  <th className="px-3 py-3 text-center">Jam Scan</th>
                  <th className="px-3 py-3 text-center w-10">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="font-bold text-sm text-slate-600">Antrian Masih Kosong</p>
                      <p className="text-xs text-slate-400 mt-0.5">Scan QR Code atau ketik NISN di panel sebelah kiri</p>
                    </td>
                  </tr>
                ) : (
                  queue.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {item.nama}
                        <div className="text-[10px] font-mono text-slate-400 font-normal">{item.nisn}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold text-[10px]">
                          {item.kelas}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-slate-600">{item.time}</td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Hapus dari antrian"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
