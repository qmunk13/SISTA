/**
 * SMART BOBOT HELPER (FITUR CERDAS PENGATUR BOBOT NILAI SOAL CBT)
 * Standar Penilaian Berbasis Kurikulum Merdeka & Standar Ujian Nasional / Sekolah
 * 
 * Target Skor Default: 100 Poin
 * Menghitung bobot secara otomatis berdasarkan jumlah butir soal:
 * - 10 Soal  -> 10.00 Poin per soal (Total 100)
 * - 15 Soal  -> 6.67 Poin per soal (atau 10 soal @ 7 + 5 soal @ 6 = 100)
 * - 20 Soal  -> 5.00 Poin per soal (Total 100)
 * - 25 Soal  -> 4.00 Poin per soal (Total 100)
 * - 30 Soal  -> 3.33 Poin per soal (atau 10 soal @ 4 + 20 soal @ 3 = 100)
 * - 35 Soal  -> 2.86 Poin per soal (Total 100)
 * - 40 Soal  -> 2.50 Poin per soal (Total 100)
 * - 45 Soal  -> 2.22 Poin per soal (Total 100)
 * - 50 Soal  -> 2.00 Poin per soal (Total 100)
 */

export interface BobotPreset {
  jumlahSoal: number;
  bobotPerSoal: number;
  bobotLabel: string;
  totalSkor: number;
  keterangan: string;
  distribusiBulat?: {
    groupA: { count: number; bobot: number };
    groupB: { count: number; bobot: number };
  };
}

export const STANDARD_BOBOT_PRESETS: BobotPreset[] = [
  {
    jumlahSoal: 10,
    bobotPerSoal: 10,
    bobotLabel: '10 Poin',
    totalSkor: 100,
    keterangan: 'Format kuis kilat / tes diagnostik cepat'
  },
  {
    jumlahSoal: 15,
    bobotPerSoal: 6.67,
    bobotLabel: '6.67 Poin',
    totalSkor: 100,
    keterangan: 'Ulangan harian ringkas (atau 10 soal @7 + 5 soal @6)',
    distribusiBulat: {
      groupA: { count: 10, bobot: 7 },
      groupB: { count: 5, bobot: 6 }
    }
  },
  {
    jumlahSoal: 20,
    bobotPerSoal: 5,
    bobotLabel: '5 Poin',
    totalSkor: 100,
    keterangan: 'Standar Ulangan Harian (UH) / Sumatif Lingkup Materi'
  },
  {
    jumlahSoal: 25,
    bobotPerSoal: 4,
    bobotLabel: '4 Poin',
    totalSkor: 100,
    keterangan: 'Standar Ujian Tengah Semester (STS) / Modul'
  },
  {
    jumlahSoal: 30,
    bobotPerSoal: 3.33,
    bobotLabel: '3.33 Poin',
    totalSkor: 100,
    keterangan: 'Standar Asesmen Sumatif Akhir Semester (SAS / SAT)',
    distribusiBulat: {
      groupA: { count: 10, bobot: 4 },
      groupB: { count: 20, bobot: 3 }
    }
  },
  {
    jumlahSoal: 35,
    bobotPerSoal: 2.86,
    bobotLabel: '2.86 Poin',
    totalSkor: 100,
    keterangan: 'Paket Ujian Campuran Menengah',
    distribusiBulat: {
      groupA: { count: 30, bobot: 3 },
      groupB: { count: 5, bobot: 2 }
    }
  },
  {
    jumlahSoal: 40,
    bobotPerSoal: 2.5,
    bobotLabel: '2.5 Poin',
    totalSkor: 100,
    keterangan: 'Standar Ujian Sekolah / Ujian Kelulusan (US / PSAJ)',
    distribusiBulat: {
      groupA: { count: 20, bobot: 3 },
      groupB: { count: 20, bobot: 2 }
    }
  },
  {
    jumlahSoal: 45,
    bobotPerSoal: 2.22,
    bobotLabel: '2.22 Poin',
    totalSkor: 100,
    keterangan: 'Paket Ujian Komprehensif',
    distribusiBulat: {
      groupA: { count: 10, bobot: 3 },
      groupB: { count: 35, bobot: 2 }
    }
  },
  {
    jumlahSoal: 50,
    bobotPerSoal: 2,
    bobotLabel: '2 Poin',
    totalSkor: 100,
    keterangan: 'Standar Try Out & Simulasi Ujian Nasional / Asesmen Nasional'
  }
];

/**
 * Menghitung bobot rata-rata per soal berdasarkan target skor (default 100)
 */
export function calculateSmartWeight(totalQuestions: number, targetScore: number = 100): number {
  if (!totalQuestions || totalQuestions <= 0) return 5;
  const raw = targetScore / totalQuestions;
  // Jika habis dibagi bulat, kembalikan integer
  if (targetScore % totalQuestions === 0) {
    return Math.round(raw);
  }
  // Jika desimal, bulatkan ke 2 desimal
  return Math.round(raw * 100) / 100;
}

/**
 * Format string bobot cerdas
 */
export function formatSmartWeight(bobot: number): string {
  if (Number.isInteger(bobot)) {
    return `${bobot}`;
  }
  return bobot.toFixed(2);
}

/**
 * Menghitung rincian distribusi bobot untuk N soal:
 * Mendukung opsi Desimal Presisi dan Bilangan Bulat Seimbang
 */
export interface SmartWeightBreakdown {
  bobotA: number;
  countA: number;
  subtotalA: number;
  bobotB?: number;
  countB?: number;
  subtotalB?: number;
  totalAkumulasi: number;
}

export interface SmartDistributionResult {
  mode: 'decimal' | 'integer_balanced';
  totalQuestions: number;
  targetScore: number;
  weights: number[];
  summaryText: string;
  formulaText: string;
  breakdown: SmartWeightBreakdown;
}

export function generateSmartWeights(
  totalQuestions: number, 
  targetScore: number = 100, 
  mode: 'decimal' | 'integer_balanced' = 'decimal'
): SmartDistributionResult {
  const n = Math.max(1, totalQuestions);

  if (mode === 'integer_balanced') {
    // Cari pembagian bilangan bulat yang totalnya persis targetScore
    const base = Math.floor(targetScore / n);
    const remainder = targetScore - (base * n);

    if (remainder === 0) {
      // Pas habis dibagi
      const weights = Array(n).fill(base);
      const breakdown: SmartWeightBreakdown = {
        bobotA: base,
        countA: n,
        subtotalA: targetScore,
        totalAkumulasi: targetScore
      };
      return {
        mode: 'integer_balanced',
        totalQuestions: n,
        targetScore,
        weights,
        summaryText: `Semua ${n} butir soal bernilai sama (${base} Poin)`,
        formulaText: `${n} soal × ${base} poin = ${targetScore} poin`,
        breakdown
      };
    }

    // Ada sisa: sejumlah `remainder` soal berbobot `base + 1`, sisanya `base`
    const countA = remainder;
    const bobotA = base + 1;
    const countB = n - remainder;
    const bobotB = base;

    const weights: number[] = [];
    for (let i = 0; i < countA; i++) weights.push(bobotA);
    for (let i = 0; i < countB; i++) weights.push(bobotB);

    const subtotalA = countA * bobotA;
    const subtotalB = countB * bobotB;

    const breakdown: SmartWeightBreakdown = {
      bobotA,
      countA,
      subtotalA,
      bobotB,
      countB,
      subtotalB,
      totalAkumulasi: subtotalA + subtotalB
    };

    return {
      mode: 'integer_balanced',
      totalQuestions: n,
      targetScore,
      weights,
      summaryText: `${countA} soal @ ${bobotA} poin + ${countB} soal @ ${bobotB} poin`,
      formulaText: `(${countA} × ${bobotA}) + (${countB} × ${bobotB}) = ${targetScore} poin`,
      breakdown
    };
  }

  // MODE DESIMAL PRESISI
  const avg = targetScore / n;
  if (targetScore % n === 0) {
    const intBobot = Math.round(avg);
    const weights = Array(n).fill(intBobot);
    const breakdown: SmartWeightBreakdown = {
      bobotA: intBobot,
      countA: n,
      subtotalA: targetScore,
      totalAkumulasi: targetScore
    };
    return {
      mode: 'decimal',
      totalQuestions: n,
      targetScore,
      weights,
      summaryText: `Semua ${n} butir soal berbobot ${intBobot} poin`,
      formulaText: `${n} soal × ${intBobot} poin = ${targetScore} poin`,
      breakdown
    };
  }

  // Desimal dengan 2 angka di belakang koma (misal 30 soal -> 3.33)
  const roundedBobot = Math.round(avg * 100) / 100;
  const weights = Array(n).fill(roundedBobot);
  
  // Hitung selisih pembulatan untuk disesuaikan pada soal terakhir agar tepat targetScore
  const rawSum = roundedBobot * n;
  const diff = Math.round((targetScore - rawSum) * 100) / 100;
  if (Math.abs(diff) > 0.001 && n > 0) {
    weights[weights.length - 1] = Math.round((weights[weights.length - 1] + diff) * 100) / 100;
  }

  const finalSum = weights.reduce((acc, w) => acc + w, 0);

  return {
    mode: 'decimal',
    totalQuestions: n,
    targetScore,
    weights,
    summaryText: `Rata-rata ${roundedBobot.toFixed(2)} poin per butir soal (Penyeimbang akhir ${weights[weights.length - 1].toFixed(2)})`,
    formulaText: `${targetScore} poin ÷ ${n} soal = ${roundedBobot.toFixed(2)} poin/soal (Total Tepat ${finalSum})`,
    breakdown: {
      bobotA: roundedBobot,
      countA: n,
      subtotalA: finalSum,
      totalAkumulasi: finalSum
    }
  };
}

/**
 * Memberikan rekomendasi narasi cerdas dalam bahasa Indonesia
 */
export function getSmartWeightExplanation(count: number, target: number = 100): string {
  if (count <= 0) return 'Jumlah butir soal belum ditentukan.';
  
  const decimalResult = generateSmartWeights(count, target, 'decimal');
  const integerResult = generateSmartWeights(count, target, 'integer_balanced');

  if (target % count === 0) {
    return `Untuk ${count} butir soal dengan target skor ${target}: setiap soal memiliki bobot ${decimalResult.breakdown.bobotA} poin.`;
  }

  return `Untuk ${count} butir soal dengan target skor ${target}:
• Pilihan Desimal Rata: ${decimalResult.summaryText}.
• Pilihan Bilangan Bulat: ${integerResult.summaryText} (Total Tepat ${target} Poin).`;
}
