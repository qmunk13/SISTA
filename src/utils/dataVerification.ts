import { OFFICIAL_56_SCHEMAS } from '../data/schemas';

export interface DataVerificationResult {
  verifiedData: Record<string, any[]>;
  missingKeys: string[];
  totalRows: number;
  sheetRowCounts: Record<string, number>;
  isComplete: boolean;
  statusMessage: string;
}

/**
 * Ensures that dbData strictly matches all 56 defined table schemas.
 * If any schema key is missing from the Google Sheets response or invalid,
 * it safely initializes it as an empty array [] to prevent app crashes.
 */
export function verifyAndSanitize56Data(
  rawData: Record<string, any[]> | null | undefined
): DataVerificationResult {
  const verifiedData: Record<string, any[]> = {};
  const missingKeys: string[] = [];
  const sheetRowCounts: Record<string, number> = {};
  let totalRows = 0;

  const inputObj = rawData && typeof rawData === 'object' ? rawData : {};

  OFFICIAL_56_SCHEMAS.forEach((schema) => {
    const key = schema.name;
    const val = inputObj[key];

    if (Array.isArray(val)) {
      verifiedData[key] = val;
      sheetRowCounts[key] = val.length;
      totalRows += val.length;
    } else {
      // Missing or invalid array -> safely initialize as empty array
      verifiedData[key] = [];
      sheetRowCounts[key] = 0;
      missingKeys.push(key);
    }
  });

  const isComplete = missingKeys.length === 0;
  const loadedCount = OFFICIAL_56_SCHEMAS.length - missingKeys.length;

  let statusMessage = '';
  if (isComplete) {
    statusMessage = `Tersinkronisasi 56/56 Tabel (${totalRows.toLocaleString('id-ID')} baris data)`;
  } else if (loadedCount > 0) {
    statusMessage = `Tersinkronisasi ${loadedCount}/56 Tabel (${missingKeys.length} struktur kosong disiapkan)`;
  } else {
    statusMessage = `Struktur 56 Tabel Siap (Menunggu respon Google Spreadsheet)`;
  }

  return {
    verifiedData,
    missingKeys,
    totalRows,
    sheetRowCounts,
    isComplete,
    statusMessage,
  };
}

/**
 * Group verified database stats by category
 */
export function getCategoryBreakdown(sheetRowCounts: Record<string, number>): Record<string, { totalTables: number; loadedTables: number; totalRows: number }> {
  const categories: Record<string, { totalTables: number; loadedTables: number; totalRows: number }> = {};

  OFFICIAL_56_SCHEMAS.forEach((schema) => {
    const cat = schema.category;
    if (!categories[cat]) {
      categories[cat] = { totalTables: 0, loadedTables: 0, totalRows: 0 };
    }
    categories[cat].totalTables += 1;
    const count = sheetRowCounts[schema.name] ?? 0;
    if (count > 0) {
      categories[cat].loadedTables += 1;
    }
    categories[cat].totalRows += count;
  });

  return categories;
}
