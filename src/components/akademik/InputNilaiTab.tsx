import React from 'react';
import PenilaianFormatifSumatif from './PenilaianFormatifSumatif';

export interface NilaiSiswaRecord {
  studentId: string;
  nisn: string;
  name: string;
  class: string;
  semester: string;
  mataPelajaran: string;
  tp1: number;
  tp2: number;
  tp3: number;
  tp4: number;
  sts: number;
  sas: number;
  nilaiAkhir: number;
  ketercapaian: 'Tuntas' | 'Perlu Bimbingan';
  deskripsiTinggi: string;
  deskripsiRendah: string;
}

/**
 * InputNilaiTab - Unified Academic Grading Tab
 * Standardized to Format Resmi Kurikulum Merdeka (10 TP Formatif + 5 LM Sumatif + STS + SAS + NA).
 * Defaults automatically to T.A 2026/2027 and active semester with persistent sync.
 */
export default function InputNilaiTab() {
  return <PenilaianFormatifSumatif />;
}
