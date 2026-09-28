import { Siswa, Tagihan } from '../types';
import { initialSiswa, initialTagihan } from './mockData';

export function parseAllSiswa(): Siswa[] {
  return initialSiswa;
}

export function parseAllTagihan(siswaList: Siswa[]): Tagihan[] {
  return initialTagihan;
}

