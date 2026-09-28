import { MadingItem } from '../types';
import { db } from './db';

export const INITIAL_MADING: MadingItem[] = [];

export function ensureMadingSeedData() {
  const existing = db.get<MadingItem>('mading_items');
  if (!existing || existing.length === 0) {
    db.set('mading_items', INITIAL_MADING);
  }
}

