import React from 'react';
import { Check, Lock, ChevronRight, Sparkles, AlertCircle, ShieldCheck, Zap } from 'lucide-react';
import { StepNumber } from '../types';

interface StepTrackerProps {
  currentStep: StepNumber;
  completedSteps: number[];
  onSelectStep: (step: StepNumber) => void;
}

export const StepTracker: React.FC<StepTrackerProps> = ({
  currentStep,
  completedSteps,
  onSelectStep,
}) => {
  const steps = [
    {
      number: 1,
      title: 'Tahap 1',
      name: 'Lihat Data Saya',
      desc: 'Pencarian PDKT/NISN/NIK',
    },
    {
      number: 2,
      title: 'Tahap 2',
      name: 'Review Biodata Diri',
      desc: 'Koreksi 52 Kolom Profil',
    },
    {
      number: 3,
      title: 'Tahap 3',
      name: 'Jadwal Pekerjaan',
      desc: 'Status & Tempat Kerja',
    },
    {
      number: 4,
      title: 'Tahap 4',
      name: 'Kesepakatan Jadwal',
      desc: 'Pilihan Wajib 3x Seminggu',
    },
    {
      number: 5,
      title: 'Tahap 5',
      name: 'Final Pernyataan',
      desc: 'Materai 10k & Rekap Final',
    },
  ];

  // Calculate progress percentage out of 5 steps
  const progressPercent = Math.round(((completedSteps.length) / 5) * 100);

  return (
    <div id="step-tracker-card" className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-700/80 shadow-2xl shadow-black/50 p-3.5 sm:p-7 mb-4 sm:mb-8 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* MOBILE ONLY (< sm): Ultra-Compact Horizontal Stepper */}
      <div className="sm:hidden relative z-10 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-950/90 px-2 py-0.5 rounded-full border border-yellow-500/40">
              Tahap {currentStep}/5
            </span>
            <span className="text-xs font-bold text-white truncate max-w-[170px]">
              {steps[currentStep - 1]?.name}
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-yellow-400">
            {progressPercent}%
          </span>
        </div>

        {/* 5 Connected Mini Step Pills on Mobile */}
        <div className="grid grid-cols-5 gap-1">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            const isAccessible = isCompleted || isCurrent || step.number === 1;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => {
                  if (isAccessible) onSelectStep(step.number as StepNumber);
                }}
                disabled={!isAccessible}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : isCurrent
                    ? 'bg-yellow-400 shadow-sm shadow-yellow-400/50 ring-2 ring-yellow-400/30'
                    : 'bg-slate-800'
                }`}
                title={`${step.title}: ${step.name}`}
              />
            );
          })}
        </div>
      </div>

      {/* DESKTOP / TABLET (>= sm): Full Detailed Step Tracker Grid */}
      <div className="hidden sm:block">
        <div className="relative z-10 flex sm:flex-row items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-yellow-300 bg-yellow-950/90 px-3 py-1 rounded-full border border-yellow-500/50 shadow-sm">
                <Zap className="w-3 h-3 text-yellow-400" />
                Alur Verifikasi Terstruktur 5 Tahap
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Tahap {currentStep} dari 5
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1.5 font-['Outfit',sans-serif] tracking-tight">
              Tahapan Verifikasi & Pemutakhiran Data Siswa
            </h2>
          </div>

          {/* Progress Bar Mini */}
          <div className="flex items-center gap-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-inner">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Kelengkapan Data</span>
              <div className="text-base font-extrabold text-yellow-400 font-mono">{progressPercent}% Selesai</div>
            </div>
            <div className="w-28 sm:w-36 bg-slate-800/90 h-3 rounded-full overflow-hidden border border-slate-700 p-0.5 shadow-inner">
              <div
                className="bg-gradient-to-r from-yellow-400 via-amber-500 to-emerald-400 h-full transition-all duration-700 rounded-full shadow-lg shadow-yellow-500/30"
                style={{ width: `${Math.max(6, progressPercent)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Grid of 5 Steps */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            const isAccessible = isCompleted || isCurrent || step.number === 1;

            return (
              <button
                key={step.number}
                id={`step-indicator-${step.number}`}
                onClick={() => {
                  if (isAccessible) {
                    onSelectStep(step.number as StepNumber);
                  }
                }}
                disabled={!isAccessible}
                className={`relative text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3 group ${
                  isCurrent
                    ? 'bg-gradient-to-br from-blue-950/80 via-slate-900 to-indigo-950/80 border-blue-500 shadow-xl shadow-blue-950/80 ring-2 ring-blue-500/40 transform -translate-y-0.5'
                    : isCompleted
                    ? 'bg-slate-900/80 hover:bg-slate-800/90 border-emerald-500/50 hover:border-emerald-400 shadow-md shadow-emerald-950/40 cursor-pointer'
                    : 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Step Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-xs transition-transform duration-300 ${
                    isCompleted
                      ? 'bg-gradient-to-tr from-emerald-600 to-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300/40 font-black'
                      : isCurrent
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/40 ring-2 ring-blue-300/50 animate-pulse'
                      : 'bg-slate-800 border border-slate-700 text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3] text-slate-950" />
                  ) : !isAccessible ? (
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    step.number
                  )}
                </div>

                {/* Step Text Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider ${
                        isCurrent
                          ? 'text-blue-300'
                          : isCompleted
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500 text-slate-950 px-1.5 py-0.2 rounded-full shadow-sm">
                        Aktif
                      </span>
                    )}
                    {isCompleted && !isCurrent && (
                      <span className="text-[8px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded-full">
                        ✓
                      </span>
                    )}
                  </div>
                  <h3
                    className={`text-xs font-bold truncate mt-0.5 ${
                      isCurrent ? 'text-white' : isCompleted ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {step.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">{step.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
