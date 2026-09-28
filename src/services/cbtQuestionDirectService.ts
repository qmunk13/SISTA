/**
 * CBT Question Direct Persistence Service
 * Menjamin setiap penambahan, pengubahan, dan penghapusan butir soal
 * langsung tersimpan seketika (real-time) ke Google Spreadsheet
 * (Sheet SOAL & Sheet BANK_SOAL) tanpa terhalang proteksi tabel penuh.
 */

import { db } from '../data/db';

export interface CbtQuestionPayload {
  id?: number | string;
  NomorSoal?: number | string;
  DetailSoalID?: string;
  UjianID?: string;
  BankSoalID?: string;
  pertanyaan?: string;
  Pertanyaan?: string;
  tipe?: string;
  TipeSoal?: string;
  opsi?: {
    a?: string;
    b?: string;
    c?: string;
    d?: string;
    e?: string;
  };
  PilihanA?: string;
  PilihanB?: string;
  PilihanC?: string;
  PilihanD?: string;
  PilihanE?: string;
  kunci?: string;
  KunciJawaban?: string;
  bobot?: number;
  Bobot?: number;
  pembahasan?: string;
  PembahasanRasional?: string;
  CreatedAt?: string;
}

export interface CbtSaveResponse {
  success: boolean;
  action?: string;
  detailSoalId?: string;
  message?: string;
  error?: string;
  gasResult?: any;
}

/**
 * Menyimpan butir soal baru atau pembaruan butir soal langsung ke Google Spreadsheet
 */
export async function saveQuestionDirect(
  bankPackage: any,
  question: CbtQuestionPayload,
  isEdit = false
): Promise<CbtSaveResponse> {
  try {
    const resp = await fetch('/api/cbt/save-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isEdit ? 'UPDATE' : 'CREATE',
        bankPackage,
        question
      })
    });

    const data: CbtSaveResponse = await resp.json();
    return data;
  } catch (err: any) {
    console.warn('[cbtQuestionDirectService] Fallback directly via gas-proxy:', err);
    // Client-side fallback via /api/gas-proxy
    return saveQuestionViaGasProxy(bankPackage, question, isEdit ? 'UPDATE' : 'CREATE');
  }
}

/**
 * Menyimpan sejumlah butir soal secara massal (Bulk Paste) langsung ke Google Spreadsheet
 */
export async function saveBulkQuestionsDirect(
  bankPackage: any,
  questions: CbtQuestionPayload[]
): Promise<CbtSaveResponse> {
  try {
    const resp = await fetch('/api/cbt/save-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'BULK_CREATE',
        bankPackage,
        questions
      })
    });

    const data: CbtSaveResponse = await resp.json();
    return data;
  } catch (err: any) {
    console.warn('[cbtQuestionDirectService] Bulk create fallback via gas-proxy:', err);
    let count = 0;
    for (const q of questions) {
      const res = await saveQuestionViaGasProxy(bankPackage, q, 'CREATE');
      if (res.success) count++;
    }
    return {
      success: count > 0,
      message: `${count} dari ${questions.length} butir soal berhasil disimpan ke Google Spreadsheet.`
    };
  }
}

/**
 * Menghapus butir soal tertentu langsung dari Google Spreadsheet
 */
export async function deleteQuestionDirect(
  bankPackage: any,
  detailSoalId: string
): Promise<CbtSaveResponse> {
  try {
    const resp = await fetch('/api/cbt/save-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE',
        bankPackage,
        detailSoalId
      })
    });

    const data: CbtSaveResponse = await resp.json();
    return data;
  } catch (err: any) {
    console.warn('[cbtQuestionDirectService] Delete fallback via gas-proxy:', err);
    return deleteQuestionViaGasProxy(bankPackage, detailSoalId);
  }
}

/**
 * Fallback langsung via /api/gas-proxy jika backend endpoint tidak merespon
 */
async function saveQuestionViaGasProxy(
  bankPackage: any,
  question: CbtQuestionPayload,
  action: 'CREATE' | 'UPDATE'
): Promise<CbtSaveResponse> {
  const bankId = bankPackage?.BankSoalID || bankPackage?.id || `BNK-${Date.now()}`;
  const qId = question?.DetailSoalID || `SOAL-${bankId}-${question?.id || question?.NomorSoal || Date.now()}`;

  const recordData = {
    DetailSoalID: qId,
    UjianID: question?.UjianID || bankId,
    BankSoalID: bankId,
    MataPelajaran: bankPackage?.mapel || bankPackage?.Mapel || '',
    Kelas: String(bankPackage?.kelas || bankPackage?.Kelas || ''),
    Jenjang: bankPackage?.jenjang || bankPackage?.Jenjang || 'Paket C',
    NomorSoal: question?.id || question?.NomorSoal || 1,
    Pertanyaan: question?.pertanyaan || question?.Pertanyaan || '',
    TipeSoal: question?.tipe || question?.TipeSoal || 'Pilihan Ganda',
    PilihanA: question?.opsi?.a || question?.PilihanA || '',
    PilihanB: question?.opsi?.b || question?.PilihanB || '',
    PilihanC: question?.opsi?.c || question?.PilihanC || '',
    PilihanD: question?.opsi?.d || question?.PilihanD || '',
    PilihanE: question?.opsi?.e || question?.PilihanE || '',
    KunciJawaban: String(question?.kunci || question?.KunciJawaban || 'a').toLowerCase(),
    PembahasanRasional: question?.pembahasan || question?.PembahasanRasional || '',
    Bobot: question?.bobot || question?.Bobot || 5,
    CreatedAt: question?.CreatedAt || new Date().toISOString()
  };

  const payload: any = {
    action,
    sheetName: 'SOAL',
    recordData
  };

  if (action === 'UPDATE') {
    payload.idKey = 'DetailSoalID';
    payload.idValue = qId;
  }

  const res = await fetch('/api/gas-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload })
  });

  const json = await res.json();
  const ok = json?.status === 'success' || json?.success === true;

  // Juga perbarui paket di Sheet BANK_SOAL
  if (bankPackage && ok) {
    try {
      await fetch('/api/gas-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            action: 'UPDATE',
            sheetName: 'BANK_SOAL',
            idKey: 'BankSoalID',
            idValue: bankId,
            recordData: {
              BankSoalID: bankId,
              JumlahSoal: bankPackage.jumlahSoal || (bankPackage.soalList || []).length,
              SoalJSON: typeof bankPackage.SoalJSON === 'string' ? bankPackage.SoalJSON : JSON.stringify(bankPackage.soalList || []),
              UpdatedAt: new Date().toISOString()
            }
          }
        })
      });
    } catch {}
  }

  return {
    success: ok,
    detailSoalId: qId,
    message: ok ? 'Butir soal berhasil disimpan langsung ke Google Spreadsheet!' : (json?.message || 'Gagal menyimpan butir soal'),
    gasResult: json
  };
}

/**
 * Fallback delete via /api/gas-proxy
 */
async function deleteQuestionViaGasProxy(
  bankPackage: any,
  detailSoalId: string
): Promise<CbtSaveResponse> {
  const bankId = bankPackage?.BankSoalID || bankPackage?.id || '';

  const res = await fetch('/api/gas-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: {
        action: 'DELETE',
        sheetName: 'SOAL',
        idKey: 'DetailSoalID',
        idValue: detailSoalId
      }
    })
  });

  const json = await res.json();
  const ok = json?.status === 'success' || json?.success === true;

  if (bankPackage && ok) {
    try {
      await fetch('/api/gas-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            action: 'UPDATE',
            sheetName: 'BANK_SOAL',
            idKey: 'BankSoalID',
            idValue: bankId,
            recordData: {
              BankSoalID: bankId,
              JumlahSoal: bankPackage.jumlahSoal || (bankPackage.soalList || []).length,
              SoalJSON: typeof bankPackage.SoalJSON === 'string' ? bankPackage.SoalJSON : JSON.stringify(bankPackage.soalList || []),
              UpdatedAt: new Date().toISOString()
            }
          }
        })
      });
    } catch {}
  }

  return {
    success: ok,
    message: ok ? 'Butir soal berhasil dihapus dari Google Spreadsheet' : (json?.message || 'Gagal menghapus butir soal'),
    gasResult: json
  };
}

/**
 * Menyimpan satu paket Bank Soal beserta seluruh butir soalnya langsung ke Google Spreadsheet
 */
export async function saveBankPackageDirect(bankPackage: any): Promise<CbtSaveResponse> {
  try {
    const resp = await fetch('/api/cbt/save-bank-soal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SAVE_PACKAGE',
        bankPackage
      })
    });
    const data = await resp.json();
    return data;
  } catch (err: any) {
    console.warn('[cbtQuestionDirectService] Fallback saveBankPackageDirect via gas-proxy:', err);
    // Fallback: simpan butir soal satu per satu jika API lokal gagal
    const soalList = Array.isArray(bankPackage?.soalList) ? bankPackage.soalList : [];
    if (soalList.length > 0) {
      return saveBulkQuestionsDirect(bankPackage, soalList);
    }
    return { success: false, message: err?.message || 'Gagal menyimpan paket ke spreadsheet' };
  }
}

/**
 * Menyimpan / menyinkronkan seluruh paket Bank Soal beserta seluruh butir soalnya langsung ke Google Spreadsheet
 */
export async function saveAllBankPackagesDirect(packages: any[]): Promise<CbtSaveResponse & { savedPkgCount?: number; savedQCount?: number }> {
  try {
    const resp = await fetch('/api/cbt/save-bank-soal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SAVE_ALL_PACKAGES',
        packages
      })
    });
    const data = await resp.json();
    return data;
  } catch (err: any) {
    console.warn('[cbtQuestionDirectService] Error saveAllBankPackagesDirect:', err);
    return { success: false, message: err?.message || 'Gagal menyimpan paket ke spreadsheet' };
  }
}

/**
 * Menghapus paket Bank Soal dari Google Spreadsheet
 */
export async function deleteBankPackageDirect(bankPackage: any): Promise<CbtSaveResponse> {
  try {
    const resp = await fetch('/api/cbt/save-bank-soal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE_PACKAGE',
        bankPackage,
        packageId: bankPackage?.BankSoalID || bankPackage?.id
      })
    });
    const data = await resp.json();
    return data;
  } catch (err: any) {
    console.warn('[cbtQuestionDirectService] Error deleteBankPackageDirect:', err);
    return { success: false, message: err?.message || 'Gagal menghapus paket dari spreadsheet' };
  }
}

