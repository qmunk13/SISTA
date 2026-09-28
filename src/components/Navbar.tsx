import React from 'react';
import { Bot, RotateCcw, Sparkles } from 'lucide-react';
import { StepNumber } from '../types';
import { LogoRombel } from './LogoRombel';

interface NavbarProps {
  currentStep: StepNumber;
  completedSteps: number[];
  onReset: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  totalSubmissions?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  completedSteps,
  onReset,
  onToggleChat,
  isChatOpen,
}) => {
  const stepTitles = [
    '1. Lihat Data Saya',
    '2. Review Biodata Diri',
    '3. Jadwal Pekerjaan',
    '4. Kesepakatan Jadwal',
    '5. Final Pernyataan',
  ];

  return (
    <header id="app-navbar" className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-xl border-b border-slate-800 text-white shadow-xl shadow-black/40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Info */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Logo */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl p-0.5 bg-slate-900 border border-yellow-500/40 flex items-center justify-center shadow-md overflow-hidden">
                <LogoRombel className="w-full h-full" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="hidden sm:inline-flex text-[11px] sm:text-xs font-black tracking-wide text-yellow-400 uppercase font-mono">
                  Rombongan Belajar Karang Taruna Kec. Tambora
                </span>
                <span className="sm:hidden text-[11px] font-black tracking-wide text-yellow-400 uppercase font-mono">
                  Rombel Tambora
                </span>
                <span className="hidden lg:inline-block text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                  Aktif
                </span>
              </div>
              <h1 className="text-xs sm:text-base font-bold text-slate-100 truncate mt-0.5 font-['Outfit',sans-serif]">
                Sistem Konfirmasi Data Siswa
              </h1>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Step Badge (Desktop only) */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
              <span className="text-slate-400 text-[11px] font-medium">Tahap Aktif:</span>
              <strong className="text-yellow-300 font-bold">{stepTitles[currentStep - 1]}</strong>
            </div>

            {/* AI Assistant Button (Compact on mobile) */}
            <button
              id="btn-toggle-ai-chat"
              onClick={onToggleChat}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 border ${
                isChatOpen
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
              }`}
              title="Tanya AI Asisten"
            >
              <Bot className="w-3.5 h-3.5 text-yellow-300" />
              <span className="hidden sm:inline">AI Bantuan</span>
            </button>

            {/* Reset / Mulai Ulang */}
            <button
              id="btn-reset-workflow"
              onClick={onReset}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 rounded-lg transition cursor-pointer"
              title="Mulai Ulang Alur"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
