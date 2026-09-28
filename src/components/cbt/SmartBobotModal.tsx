import React, { useState, useMemo } from 'react';
import { 
  Calculator, Sparkles, Check, CheckCircle2, AlertTriangle, 
  HelpCircle, ArrowRight, Layers, Sliders, RefreshCw, X, Zap 
} from 'lucide-react';
import { 
  STANDARD_BOBOT_PRESETS, 
  generateSmartWeights, 
  calculateSmartWeight, 
  formatSmartWeight,
  type BobotPreset 
} from '../../utils/smartBobotHelper';

interface SmartBobotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPackageTitle: string;
  currentPackageId: string;
  currentQuestionCount: number;
  currentQuestions: any[];
  onApplyWeights: (weights: number[], summary: string) => void;
}

export const SmartBobotModal: React.FC<SmartBobotModalProps> = ({
  isOpen,
  onClose,
  currentPackageTitle,
  currentPackageId,
  currentQuestionCount,
  currentQuestions,
  onApplyWeights
}) => {
  const [totalQuestions, setTotalQuestions] = useState<number>(() => {
    return currentQuestionCount > 0 ? currentQuestionCount : 20;
  });
  const [targetScore, setTargetScore] = useState<number>(100);
  const [distributionMode, setDistributionMode] = useState<'decimal' | 'integer_balanced' | 'uniform'>('decimal');
  const [uniformValue, setUniformValue] = useState<number>(5);

  // Perhitungan bobot saat ini pada paket
  const currentTotalBobot = useMemo(() => {
    return (currentQuestions || []).reduce((sum, q) => sum + (Number(q.bobot) || 5), 0);
  }, [currentQuestions]);

  // Kalkulasi distribusi bobot cerdas
  const smartCalculation = useMemo(() => {
    if (distributionMode === 'uniform') {
      const val = Math.max(1, uniformValue);
      const total = totalQuestions * val;
      return {
        mode: 'uniform' as const,
        totalQuestions,
        targetScore: total,
        weights: Array(totalQuestions).fill(val),
        summaryText: `Semua ${totalQuestions} butir soal bernilai seragam ${val} poin (Total ${total} Poin)`,
        formulaText: `${totalQuestions} butir × ${val} poin = ${total} Poin`,
        breakdown: {
          bobotA: val,
          countA: totalQuestions,
          subtotalA: total,
          totalAkumulasi: total
        }
      };
    }

    return generateSmartWeights(totalQuestions, targetScore, distributionMode);
  }, [totalQuestions, targetScore, distributionMode, uniformValue]);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: BobotPreset) => {
    setTotalQuestions(preset.jumlahSoal);
    setTargetScore(preset.totalSkor);
  };

  const handleApply = () => {
    onApplyWeights(smartCalculation.weights, smartCalculation.summaryText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Zap size={20} className="fill-amber-300 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Fitur Cerdas Pengatur Bobot Nilai Soal
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200/60">
                  Auto-Balancing
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hitung dan sesuaikan bobot poin otomatis agar pas dengan target skor ujian (100 Poin)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          
          {/* Status Paket Saat Ini */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paket Soal Terpilih</span>
              <span className="font-black text-slate-800 text-sm">{currentPackageTitle}</span>
              <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px]">
                <span>ID: {currentPackageId}</span>
                <span>•</span>
                <span className="font-bold text-indigo-700">{currentQuestionCount} Soal Saat Ini</span>
              </div>
            </div>
            <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-right shrink-0">
              <span className="text-[10px] text-slate-400 block font-medium">Akumulasi Bobot Saat Ini</span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className={`text-base font-black ${Math.round(currentTotalBobot) === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {currentTotalBobot.toFixed(1).replace('.0', '')}
                </span>
                <span className="text-[11px] text-slate-400 font-bold">/ 100 Poin</span>
                {Math.round(currentTotalBobot) === 100 ? (
                  <CheckCircle2 size={14} className="text-emerald-600 ml-0.5" />
                ) : (
                  <AlertTriangle size={14} className="text-amber-500 ml-0.5" />
                )}
              </div>
            </div>
          </div>

          {/* Quick Presets Standar (10, 20, 25, 30, 40, 50 Soal) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-600" />
                <span>Pilih Cepat Berdasarkan Jumlah Soal:</span>
              </label>
              <span className="text-[10px] text-slate-400">Target Standar: 100 Poin</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STANDARD_BOBOT_PRESETS.map((preset) => {
                const isSelected = totalQuestions === preset.jumlahSoal;
                return (
                  <button
                    key={preset.jumlahSoal}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-2.5 rounded-xl border text-left transition relative cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-300' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-black text-xs ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {preset.jumlahSoal} Soal
                      </span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {preset.bobotLabel}
                      </span>
                    </div>
                    <div className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {preset.keterangan}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parameter Kalkulator Interaktif */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex items-center gap-2">
              <Calculator size={14} className="text-indigo-600" />
              <span className="font-bold text-slate-800 text-xs">Kalkulator Pembagian Bobot Kustom</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Jumlah Butir Soal (N)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {currentQuestionCount > 0 && currentQuestionCount !== totalQuestions && (
                    <button
                      type="button"
                      onClick={() => setTotalQuestions(currentQuestionCount)}
                      className="px-2 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-indigo-600 whitespace-nowrap"
                      title="Gunakan jumlah soal paket saat ini"
                    >
                      Pakai {currentQuestionCount} Soal
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Target Skor Maksimal Ujian
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={targetScore}
                  onChange={(e) => setTargetScore(Math.max(1, parseInt(e.target.value) || 100))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Pilihan Metode Pembagian */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                Metode Pembobotan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDistributionMode('decimal')}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                    distributionMode === 'decimal'
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white/60 hover:bg-white border-slate-200'
                  }`}
                >
                  <div className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    Desimal Rata
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Contoh 30 soal: rata 3.33 poin
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionMode('integer_balanced')}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                    distributionMode === 'integer_balanced'
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white/60 hover:bg-white border-slate-200'
                  }`}
                >
                  <div className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Bilangan Bulat
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Tanpa koma: 10 soal @4 + 20 @3
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionMode('uniform')}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                    distributionMode === 'uniform'
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white/60 hover:bg-white border-slate-200'
                  }`}
                >
                  <div className="font-bold text-[11px] text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    Poin Seragam
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Tetapkan angka pasti sama
                  </div>
                </button>
              </div>

              {distributionMode === 'uniform' && (
                <div className="mt-2 flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600">Nilai Per Soal:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={uniformValue}
                    onChange={(e) => setUniformValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-center"
                  />
                  <span className="text-[10px] text-slate-400 font-medium">Poin (Total: {totalQuestions * uniformValue} Poin)</span>
                </div>
              )}
            </div>
          </div>

          {/* Hasil Kalkulasi & Rincian Pembagian */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="font-black text-emerald-950 text-xs">
                  Hasil Rekomendasi Bobot Cerdas
                </span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-lg text-[10px]">
                Total: {smartCalculation.breakdown.totalAkumulasi} Poin
              </span>
            </div>

            <p className="text-xs text-emerald-900 font-medium leading-relaxed">
              {smartCalculation.summaryText}
            </p>

            <div className="p-2.5 bg-white rounded-xl border border-emerald-100 font-mono text-[11px] text-slate-700 flex items-center justify-between">
              <span>{smartCalculation.formulaText}</span>
              <span className="font-bold text-emerald-700">Tepat 100%</span>
            </div>

            {'bobotB' in smartCalculation.breakdown && smartCalculation.breakdown.bobotB !== undefined && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 bg-white/80 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Kelompok 1</span>
                  <span className="font-bold text-slate-800">
                    {smartCalculation.breakdown.countA} Soal × {smartCalculation.breakdown.bobotA} Poin
                  </span>
                  <span className="text-[10px] text-slate-500 block">Subtotal: {smartCalculation.breakdown.subtotalA} Poin</span>
                </div>
                <div className="p-2 bg-white/80 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Kelompok 2</span>
                  <span className="font-bold text-slate-800">
                    {smartCalculation.breakdown.countB ?? 0} Soal × {smartCalculation.breakdown.bobotB ?? 0} Poin
                  </span>
                  <span className="text-[10px] text-slate-500 block">Subtotal: {smartCalculation.breakdown.subtotalB ?? 0} Poin</span>
                </div>
              </div>
            )}
          </div>

          {/* Tabel Referensi Standar Bobot Nasional */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-[11px] text-slate-700 flex items-center justify-between">
              <span>Panduan Skala Soal Ujian (Standar Kemendikdasmen)</span>
              <span className="text-[10px] text-slate-400 font-normal">Target Skor: 100</span>
            </div>
            <div className="divide-y divide-slate-100 text-[11px]">
              <div className="px-3 py-1.5 grid grid-cols-3 font-semibold text-slate-500 bg-slate-50 text-[10px]">
                <span>JUMLAH SOAL</span>
                <span>BOBOT PER BUTIR</span>
                <span className="text-right">FORMAT PENGGUNAAN</span>
              </div>
              <div className="px-3 py-1.5 grid grid-cols-3 hover:bg-slate-50">
                <span className="font-bold text-slate-800">10 Soal</span>
                <span className="font-mono text-indigo-600 font-bold">10.00 Poin</span>
                <span className="text-slate-500 text-right">Kuis Harian / Tes Diagnostik</span>
              </div>
              <div className="px-3 py-1.5 grid grid-cols-3 hover:bg-slate-50 bg-indigo-50/20">
                <span className="font-bold text-slate-800">20 Soal</span>
                <span className="font-mono text-indigo-600 font-bold">5.00 Poin</span>
                <span className="text-slate-500 text-right">Sumatif Lingkup Materi / UH</span>
              </div>
              <div className="px-3 py-1.5 grid grid-cols-3 hover:bg-slate-50">
                <span className="font-bold text-slate-800">25 Soal</span>
                <span className="font-mono text-indigo-600 font-bold">4.00 Poin</span>
                <span className="text-slate-500 text-right">Sumatif Tengah Semester (STS)</span>
              </div>
              <div className="px-3 py-1.5 grid grid-cols-3 hover:bg-slate-50 bg-indigo-50/20">
                <span className="font-bold text-slate-800">30 Soal</span>
                <span className="font-mono text-indigo-600 font-bold">3.33 Poin</span>
                <span className="text-slate-500 text-right">Sumatif Akhir Semester (SAS)</span>
              </div>
              <div className="px-3 py-1.5 grid grid-cols-3 hover:bg-slate-50">
                <span className="font-bold text-slate-800">40 Soal</span>
                <span className="font-mono text-indigo-600 font-bold">2.50 Poin</span>
                <span className="text-slate-500 text-right">Ujian Sekolah / Kelulusan (US)</span>
              </div>
              <div className="px-3 py-1.5 grid grid-cols-3 hover:bg-slate-50">
                <span className="font-bold text-slate-800">50 Soal</span>
                <span className="font-mono text-indigo-600 font-bold">2.00 Poin</span>
                <span className="text-slate-500 text-right">Try Out Asesmen Nasional</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
          
          <button
            type="button"
            onClick={handleApply}
            disabled={currentQuestionCount === 0}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer ${
              currentQuestionCount === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-200'
            }`}
          >
            <Zap size={14} className="fill-amber-300 text-amber-300" />
            <span>Terapkan Bobot Cerdas ({currentQuestionCount} Soal)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
