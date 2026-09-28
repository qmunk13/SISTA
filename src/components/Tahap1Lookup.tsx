import React, { useState } from 'react';
import { Search, Sparkles, AlertTriangle, Zap, RefreshCw, CheckCircle2 } from 'lucide-react';
import { StudentProfile } from '../types';

interface Tahap1LookupProps {
  onDataFetched: (data: StudentProfile) => void;
  existingData: StudentProfile | null;
}

export const Tahap1Lookup: React.FC<Tahap1LookupProps> = ({
  onDataFetched,
  existingData,
}) => {
  const [idInput, setIdInput] = useState(existingData?.idNumber || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'success' | 'info'>('error');

  const handleLookup = async (idToSearch?: string) => {
    const query = (idToSearch || idInput).trim();
    if (!query || query.length < 1) {
      setFeedbackType('error');
      setFeedbackMessage('Mohon masukkan No. PDKT, NISN, NIK, atau Nama Lengkap.');
      return;
    }

    setIsLoading(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch('/api/students/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idNumber: query }),
      });

      const resData = await response.json();
      if (response.ok && resData.success && resData.data) {
        setFeedbackType('success');
        onDataFetched(resData.data);
      } else {
        setFeedbackType('error');
        setFeedbackMessage(resData.message || `Data untuk "${query}" tidak ditemukan. Mohon periksa kembali nomor identitas atau nama Anda.`);
      }
    } catch (err: any) {
      console.error('Lookup error:', err);
      setFeedbackType('error');
      setFeedbackMessage('Gagal menghubungi server pangkalan data. Mohon periksa koneksi internet Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncSheet = async () => {
    setIsSyncing(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/students/sync-sheet', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedbackType('success');
        setFeedbackMessage(`Sinkronisasi Berhasil: ${data.count} data siswa berhasil diperbarui.`);
      } else {
        setFeedbackType('error');
        setFeedbackMessage(data.message || 'Gagal menyinkronkan data.');
      }
    } catch (err) {
      setFeedbackType('error');
      setFeedbackMessage('Gagal terhubung ke pangkalan data.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div id="tahap1-container" className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Search & Verification Card */}
      <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl shadow-indigo-950/60 border border-indigo-500/30 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 space-y-5 sm:space-y-6">
          {/* Header Section - Clean & Focused */}
          <div className="pb-3 sm:pb-4 border-b border-indigo-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-yellow-400 bg-yellow-950/80 px-2.5 py-0.5 rounded-full border border-yellow-500/40">
                    <Sparkles className="w-3 h-3 text-yellow-300 shrink-0" />
                    <span>Tahap 1: Lihat Data Saya</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Database Terhubung</span>
                  </div>
                </div>
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white font-['Outfit',sans-serif]">
                  Pencarian & Lihat Data Saya
                </h2>
              </div>

              {/* Sync Button */}
              <button
                type="button"
                id="btn-sync-spreadsheet"
                onClick={handleSyncSheet}
                disabled={isSyncing}
                title="Tarik pembaruan data terbaru"
                className="self-start sm:self-center inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Refresh Data'}</span>
              </button>
            </div>
          </div>

          {/* Search Input Section */}
          <div className="space-y-2 sm:space-y-2.5 relative">
            <label htmlFor="input-nisn-nik" className="block text-[10px] sm:text-xs font-semibold text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis">
              Ketik <span className="text-yellow-300 font-bold">No. PDKT</span>, <span className="text-cyan-300 font-bold">NISN</span>, <span className="text-emerald-300 font-bold">NIK</span>, atau <span className="text-white font-bold">Nama Lengkap</span>:
            </label>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-yellow-500 rounded-xl sm:rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-300"></div>
                <div className="relative">
                  <input
                    id="input-nisn-nik"
                    type="text"
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLookup();
                    }}
                    placeholder="Contoh: 001, 0088832474, 317304..., atau Nama Siswa"
                    className="w-full pl-4 sm:pl-5 pr-11 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 text-white font-mono font-medium text-xs sm:text-base focus:border-yellow-400 focus:outline-none transition shadow-inner"
                    autoComplete="off"
                  />
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute right-3.5 sm:right-4 top-3.5 sm:top-4 pointer-events-none group-focus-within:text-yellow-400 transition-colors" />
                </div>
              </div>
              
              <button
                id="btn-cari-data"
                onClick={() => handleLookup()}
                disabled={isLoading || !idInput.trim()}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-black px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition shadow-xl shadow-blue-600/30 cursor-pointer shrink-0 border border-blue-400/40"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Memuat Data...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300" />
                    <span>Lihat Data Saya</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback message banner */}
          {feedbackMessage && (
            <div
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 sm:gap-3 border shadow-lg ${
                feedbackType === 'success'
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50'
                  : feedbackType === 'info'
                  ? 'bg-blue-950/80 text-blue-200 border-blue-500/50 shadow-blue-950/50'
                  : 'bg-amber-950/80 text-amber-200 border-amber-500/50 shadow-amber-950/50'
              }`}
            >
              {feedbackType === 'success' ? (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              )}
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
