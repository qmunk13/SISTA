import { SoalPilihanGanda, BankSoalPackage, generate20SoalPilihanGanda, sanitizeNoModul, cleanConceptName } from '../data/soalGenerator';

export interface GenerateSoalPdfParams {
  file?: File | null;
  files?: File[] | null;
  pdfBase64?: string;
  pdfBase64List?: string[];
  pdfUrl?: string;
  pdfUrls?: string[];
  materiText?: string;
  mapel: string;
  topik: string;
  temaModul?: string;
  kelas: string;
  jumlahSoal?: number;
  guru?: string;
  tingkatKesulitan?: 'mudah' | 'sedang' | 'tantangan' | string;
}

export interface GenerateSoalPdfResult {
  success: boolean;
  message?: string;
  soalList: SoalPilihanGanda[];
  ringkasanDokumen?: string;
  source?: string;
  modelUsed?: string;
  isFallback?: boolean;
  mapel?: string;
  topik?: string;
  kelas?: string;
  jumlahSoal?: number;
}

/**
 * Konversi File objek (PDF) ke base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Cek status kesiapan API Gemini di server
 */
export async function checkAiExamStatus(): Promise<{ available: boolean; model: string; message?: string }> {
  try {
    const res = await fetch('/api/ai/status', {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      return { available: false, model: 'offline' };
    }
    const data = await res.json();
    return {
      available: Boolean(data.available),
      model: data.model || 'gemini-3.8-flash'
    };
  } catch (e) {
    return { available: false, model: 'offline' };
  }
}

/**
 * Generate butir soal pilihan ganda asli dan kontekstual dari dokumen PDF menggunakan Gemini AI
 * Dilengkapi pengamanan penuh terhadap error jaringan ("Failed to fetch") melalui Smart Curriculum Engine
 */
export async function generateSoalFromPdfWithAI(params: GenerateSoalPdfParams): Promise<GenerateSoalPdfResult> {
  const base64List: string[] = params.pdfBase64List ? [...params.pdfBase64List] : [];
  
  // Batasi ukuran base64 jika file terlalu besar (> 15 MB) agar tidak membebani reverse-proxy
  const MAX_FILE_SIZE_FOR_BASE64 = 15 * 1024 * 1024;

  if (params.files && params.files.length > 0) {
    for (const f of params.files) {
      if (f.size <= MAX_FILE_SIZE_FOR_BASE64) {
        try {
          const b64 = await fileToBase64(f);
          base64List.push(b64);
        } catch (err) {
          console.warn('[AI Exam Service] Gagal konversi file ke base64:', err);
        }
      }
    }
  } else if (params.file && params.file.size <= MAX_FILE_SIZE_FOR_BASE64) {
    try {
      const b64 = await fileToBase64(params.file);
      base64List.push(b64);
    } catch (err) {
      console.warn('[AI Exam Service] Gagal konversi file ke base64:', err);
    }
  } else if (params.pdfBase64) {
    base64List.push(params.pdfBase64);
  }

  const payload = {
    pdfBase64: base64List[0] || '',
    pdfBase64List: base64List,
    pdfUrl: params.pdfUrl || (params.pdfUrls && params.pdfUrls[0]) || '',
    pdfUrls: params.pdfUrls || (params.pdfUrl ? [params.pdfUrl] : []),
    materiText: params.materiText,
    mapel: params.mapel,
    topik: params.topik,
    temaModul: params.temaModul || '',
    kelas: params.kelas,
    jumlahSoal: params.jumlahSoal || 20,
    tingkatKesulitan: params.tingkatKesulitan || 'mudah'
  };

  // 1. Coba hubungi backend server (Gemini AI API)
  try {
    const response = await fetch('/api/ai/generate-soal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(75000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.soalList) && data.soalList.length > 0) {
        const cleanList = data.soalList.map((q: any, idx: number) => ({
          ...q,
          id: idx + 1,
          pertanyaan: sanitizeNoModul(q.pertanyaan || ''),
          opsi: {
            a: sanitizeNoModul(q.opsi?.a || ''),
            b: sanitizeNoModul(q.opsi?.b || ''),
            c: sanitizeNoModul(q.opsi?.c || ''),
            d: sanitizeNoModul(q.opsi?.d || ''),
            ...(q.opsi?.e ? { e: sanitizeNoModul(q.opsi?.e || '') } : {})
          },
          pembahasan: sanitizeNoModul(q.pembahasan || '')
        }));

        return {
          success: true,
          soalList: cleanList,
          ringkasanDokumen: sanitizeNoModul(data.ringkasanDokumen || ''),
          source: data.source || 'Dokumen PDF Materi Pembelajaran',
          modelUsed: data.modelUsed || 'Gemini 3.1 Flash Lite',
          isFallback: Boolean(data.isFallback),
          mapel: data.mapel || params.mapel,
          topik: cleanConceptName(data.topik || params.topik),
          kelas: data.kelas || params.kelas,
          jumlahSoal: cleanList.length
        };
      }
    }
  } catch (netErr: any) {
    console.warn('[AI Exam Service] Backend API tidak dapat dijangkau (Failed to fetch / timeout), mengaktifkan mesin kurikulum materi:', netErr?.message || netErr);
  }

  // 2. Fallback mandiri di sisi klien berstandar kurikulum sekolah ramah siswa
  const cleanK = String(params.kelas).replace(/\D/g, '') || '4';
  const paket = ['4', '5', '6'].includes(cleanK) ? 'A' : ['7', '8', '9'].includes(cleanK) ? 'B' : 'C';
  
  const fallbackQuestions = generate20SoalPilihanGanda({
    mapel: params.mapel,
    topik: cleanConceptName(params.topik),
    tema: cleanConceptName(params.temaModul || params.topik),
    kelas: cleanK,
    paket
  });

  const targetCount = Math.min(Math.max(params.jumlahSoal || 20, 3), 25);
  const slicedQuestions = fallbackQuestions.slice(0, targetCount);

  return {
    success: true,
    soalList: slicedQuestions,
    ringkasanDokumen: `Materi pembelajaran "${cleanConceptName(params.topik)}" (${params.mapel} Kelas ${params.kelas}) menyajikan konsep pokok yang ringkas dan ramah siswa.`,
    source: 'Materi Kurikulum Sekolah Terpadu',
    modelUsed: 'Kurikulum Sekolah Terpadu',
    isFallback: true,
    mapel: params.mapel,
    topik: cleanConceptName(params.topik),
    kelas: params.kelas,
    jumlahSoal: slicedQuestions.length
  };
}

