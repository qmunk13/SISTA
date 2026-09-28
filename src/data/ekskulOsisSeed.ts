import { EkskulItem, EkskulMember, EkskulPresensi, EkskulNilai, OsisMember, OsisProker } from '../types';

export const SEED_EKSKUL: EkskulItem[] = [];
export const SEED_MEMBERS: EkskulMember[] = [];
export const SEED_PRESENSI: EkskulPresensi[] = [];
export const SEED_NILAI: EkskulNilai[] = [];
export const SEED_OSIS_MEMBERS: OsisMember[] = [];
export const SEED_OSIS_PROKER: OsisProker[] = [];

export function ensureEkskulSeedData(): void {
  // Bersihkan data dummy secara permanen dan jangan membuat dummy baru
}
