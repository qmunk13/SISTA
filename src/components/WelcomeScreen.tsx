import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Award } from 'lucide-react';
import { LogoRombel } from './LogoRombel';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="w-full max-w-xl mx-auto my-auto py-2 sm:py-6 animate-fadeIn">
      <div className="relative bg-gradient-to-br from-[#0B0F19] via-[#16192E] to-[#0B0F19] text-white rounded-3xl p-4 sm:p-7 shadow-2xl shadow-black/80 border border-yellow-500/30 overflow-hidden text-center">
        {/* Ambient Glows */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center space-y-3 sm:space-y-4.5">
          {/* Logo Badge */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-blue-500 rounded-2xl blur-xs opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl p-1.5 bg-slate-950/90 border border-yellow-400/50 shadow-xl flex items-center justify-center">
              <LogoRombel className="w-full h-full drop-shadow-md" />
            </div>
          </div>

          {/* Sapaan Karang Taruna */}
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-yellow-300 bg-yellow-950/90 px-3 py-0.5 rounded-full border border-yellow-500/40 shadow-sm">
              <Sparkles className="w-3 h-3 text-yellow-400 shrink-0" />
              <span>Rombongan Belajar Karang Taruna</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white font-['Outfit',sans-serif] leading-tight">
              Assalamualaikum! <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-500 drop-shadow-sm">
                Aditya Karya Mahatva Yodha
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Portal Verifikasi & Pemutakhiran Data Siswa Rombel <strong> Karang Taruna Kecamatan Tambora</strong>.
            </p>
          </div>

          {/* 5 Tahapan Ringkas 1 Baris */}
          <div className="w-full grid grid-cols-5 gap-1 sm:gap-1.5 text-center py-1">
            <div className="bg-slate-900/80 border border-slate-800 p-1 sm:p-2 rounded-xl">
              <span className="block text-[8px] sm:text-[9px] font-mono font-black text-yellow-400">1. Lihat</span>
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-200 truncate block">Data Saya</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-1 sm:p-2 rounded-xl">
              <span className="block text-[8px] sm:text-[9px] font-mono font-black text-blue-400">2. Review</span>
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-200 truncate block">Biodata Diri</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-1 sm:p-2 rounded-xl">
              <span className="block text-[8px] sm:text-[9px] font-mono font-black text-indigo-400">3. Jadwal</span>
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-200 truncate block">Pekerjaan</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-1 sm:p-2 rounded-xl">
              <span className="block text-[8px] sm:text-[9px] font-mono font-black text-amber-400">4. Jadwal</span>
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-200 truncate block">Belajar 3x</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-1 sm:p-2 rounded-xl">
              <span className="block text-[8px] sm:text-[9px] font-mono font-black text-emerald-400">5. Final</span>
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-200 truncate block">Pernyataan</span>
            </div>
          </div>

          {/* Action Button: Konfirmasi "Ya" (Directly visible on screen without scroll) */}
          <div className="w-full pt-1 space-y-2">
            <button
              id="btn-start-konfirmasi"
              onClick={onStart}
              className="w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base px-6 py-3.5 rounded-2xl shadow-xl shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-yellow-300"
            >
              <span>Ya, Mulai Konfirmasi Data</span>
              <ArrowRight className="w-4 h-4 text-slate-950 stroke-[3]" />
            </button>

            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verifikasi tersinkronisasi dengan Database Rombel Tambora</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

