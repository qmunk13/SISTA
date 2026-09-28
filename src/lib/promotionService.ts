import { normalizeClassName } from './utils';

export type PromotionActionType = 'Naik' | 'Tinggal' | 'Lulus' | 'Pindah' | 'Keluar';

export interface PromotionOption {
  value: string;
  label: string;
  action: PromotionActionType;
  targetClass: string;
}

/**
 * Returns dynamic progression paths based on current grade levels:
 * - Kelas 4 : Naik Kelas 5, Tinggal di kelas 4, Pindah, Keluar
 * - Kelas 5 : Naik Kelas 6, Tinggal di kelas 5, Pindah, Keluar
 * - Kelas 6 : Naik Kelas 7, Tinggal di kelas 6, Lulus, Pindah, Keluar
 * - Kelas 7 : Naik Kelas 8, Tinggal di kelas 7, Pindah, Keluar
 * - Kelas 8 : Naik Kelas 9, Tinggal di kelas 8, Pindah, Keluar
 * - Kelas 9 : Naik Kelas 10, Tinggal di kelas 9, Lulus, Pindah, Keluar
 * - Kelas 10 : Naik Kelas 11, Tinggal di kelas 10, Pindah, Keluar
 * - Kelas 11 : Naik Kelas 12, Tinggal di kelas 11, Pindah, Keluar
 * - Kelas 12 : Tinggal di kelas 12, Lulus, Pindah, Keluar
 */
export function getPromotionOptionsForClass(currentClass: string): PromotionOption[] {
  const clean = normalizeClassName(currentClass);
  const grade = parseInt(clean);


  // Kelas 4
  if (grade === 4) {
    return [
      { value: 'Naik_5', label: 'Naik Kelas 5', action: 'Naik', targetClass: '5' },
      { value: 'Tinggal_4', label: 'Tinggal di Kelas 4', action: 'Tinggal', targetClass: '4' },
      { value: 'Pindah', label: 'Pindah Sekolah (Mutasi)', action: 'Pindah', targetClass: 'Pindah' },
      { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
    ];
  }

  // Kelas 5
  if (grade === 5) {
    return [
      { value: 'Naik_6', label: 'Naik Kelas 6', action: 'Naik', targetClass: '6' },
      { value: 'Tinggal_5', label: 'Tinggal di Kelas 5', action: 'Tinggal', targetClass: '5' },
      { value: 'Pindah', label: 'Pindah Sekolah (Mutasi)', action: 'Pindah', targetClass: 'Pindah' },
      { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
    ];
  }

  // Kelas 6
  if (grade === 6) {
    return [
      { value: 'Naik_7', label: 'Naik Kelas 7 (Paket B)', action: 'Naik', targetClass: '7' },
      { value: 'Lulus', label: 'Lulus (Tamat Paket A)', action: 'Lulus', targetClass: 'Lulus' },
      { value: 'Tinggal_6', label: 'Tinggal di Kelas 6', action: 'Tinggal', targetClass: '6' },
      { value: 'Pindah', label: 'Pindah Sekolah (Mutasi)', action: 'Pindah', targetClass: 'Pindah' },
      { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
    ];
  }

  // Kelas 7
  if (grade === 7) {
    return [
      { value: 'Naik_8', label: 'Naik Kelas 8', action: 'Naik', targetClass: '8' },
      { value: 'Tinggal_7', label: 'Tinggal di Kelas 7', action: 'Tinggal', targetClass: '7' },
      { value: 'Pindah', label: 'Pindah Sekolah (Mutasi)', action: 'Pindah', targetClass: 'Pindah' },
      { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
    ];
  }

  // Kelas 8
  if (grade === 8) {
    return [
      { value: 'Naik_9', label: 'Naik Kelas 9', action: 'Naik', targetClass: '9' },
      { value: 'Tinggal_8', label: 'Tinggal di Kelas 8', action: 'Tinggal', targetClass: '8' },
      { value: 'Pindah', label: 'Pindah Sekolah (Mutasi)', action: 'Pindah', targetClass: 'Pindah' },
      { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
    ];
  }

  // Kelas 9
  if (grade === 9) {
    return [
      { value: 'Naik_10', label: 'Naik Kelas 10 (Paket C)', action: 'Naik', targetClass: '10' },
      { value: 'Lulus', label: 'Lulus (Tamat Paket B)', action: 'Lulus', targetClass: 'Lulus' },
      { value: 'Tinggal_9', label: 'Tinggal di Kelas 9', action: 'Tinggal', targetClass: '9' },
      { value: 'Pindah', label: 'Pindah Sekolah (Mutasi)', action: 'Pindah', targetClass: 'Pindah' },
      { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
    ];
  }

  // Kelas 10
  if (grade === 10) {
    return [
      { value: 'Naik_11', label: 'Naik Kelas 11', action: 'Naik', targetClass: '11' },
      { value: 'Tinggal_10', label: 'Tinggal di Kelas 10', action: 'Tinggal', targetClass: '10' },
      { value: 'Pindah', label: 'Pindah Sekolah (Mutasi)', action: 'Pindah', targetClass: 'Pindah' },
      { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
    ];
  }

  // Kelas 11
  if (grade === 11) {
    return [
      { value: 'Naik_12', label: 'Naik Kelas 12', action: 'Naik', targetClass: '12' },
      { value: 'Tinggal_11', label: 'Tinggal di Kelas 11', action: 'Tinggal', targetClass: '11' },
      { value: 'Pindah', label: 'Pindah Sekolah (Mutasi)', action: 'Pindah', targetClass: 'Pindah' },
      { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
    ];
  }

  // Kelas 12
  if (grade >= 12) {
    return [
      { value: 'Lulus', label: 'Lulus (Tamat Paket C)', action: 'Lulus', targetClass: 'Lulus' },
      { value: 'Tinggal_12', label: 'Tinggal di Kelas 12', action: 'Tinggal', targetClass: '12' },
      { value: 'Pindah', label: 'Pindah Sekolah (Mutasi)', action: 'Pindah', targetClass: 'Pindah' },
      { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
    ];
  }

  // Fallback if generic or unparsed grade
  return [
    { value: `Naik_${grade ? grade + 1 : 'Next'}`, label: `Naik Kelas ${grade ? grade + 1 : ''}`, action: 'Naik', targetClass: grade ? `${grade + 1}` : 'Lulus' },
    { value: `Tinggal_${clean}`, label: `Tinggal di Kelas ${clean}`, action: 'Tinggal', targetClass: clean },
    { value: 'Lulus', label: 'Lulus', action: 'Lulus', targetClass: 'Lulus' },
    { value: 'Pindah', label: 'Pindah', action: 'Pindah', targetClass: 'Pindah' },
    { value: 'Keluar', label: 'Keluar', action: 'Keluar', targetClass: 'Keluar' },
  ];
}
