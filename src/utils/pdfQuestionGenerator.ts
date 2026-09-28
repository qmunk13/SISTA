import { SoalPilihanGanda } from '../data/soalGenerator';
export interface PdfPageImage {
  pageNum: number;
  dataUrl: string;
  width?: number;
  height?: number;
}

export interface GeneratePdfQuestionsOptions {
  materiText: string;
  mapel: string;
  topik: string;
  temaModul?: string;
  kelas: string;
  jumlahSoal?: number;
  tingkatKesulitan?: string;
  images?: PdfPageImage[];
}

export interface GeneratedPdfExamResult {
  soalList: SoalPilihanGanda[];
  ringkasanDokumen: string;
  topikUtama: string;
  totalEkstraksi: number;
}

/**
 * Pembersih dan normalisasi teks dokumen PDF
 */
function cleanPdfRawText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/--- Halaman \d+ ---/gi, '\n')
    .replace(/=== (BERKAS|DOKUMEN MATERI): [^=]+ ===/gi, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Deteksi judul bab atau topik utama dari teks PDF jika pengguna tidak mengisi spesifik
 */
export function extractMainTopicFromPdfText(text: string, defaultTopic: string): string {
  if (!text) return defaultTopic;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (const line of lines.slice(0, 15)) {
    // Cari baris yang mirip judul Bab
    if (/^(bab|tema|modul|unit|pelajaran)\s+\d+[:.\-\s]/i.test(line)) {
      return line.replace(/^(bab|tema|modul|unit|pelajaran)\s+\d+[:.\-\s]*/i, '').trim() || line;
    }
    if (/^[A-Z0-9\s,.\-':]{5,60}$/.test(line) && !line.includes('HALAMAN') && !line.includes('KURIKULUM')) {
      return line;
    }
  }
  return defaultTopic;
}

/**
 * Ekstraksi definisi konsep dari teks (pola: "[Term] adalah/merupakan/yaitu/artinya [Definisi]")
 */
interface DefinitionItem {
  term: string;
  definition: string;
  fullSentence: string;
}

function extractDefinitions(sentences: string[]): DefinitionItem[] {
  const results: DefinitionItem[] = [];
  const regexDef = /^([^,.()]+?)\s+(adalah|merupakan|yaitu|ialah|artinya|didefinisikan sebagai)\s+([^.]{15,220})/i;

  for (const s of sentences) {
    const trimmed = s.trim();
    const match = trimmed.match(regexDef);
    if (match) {
      const rawTerm = match[1].trim();
      const connector = match[2].trim();
      const rawDef = match[3].trim();
      // Pastikan term bukan kata ganti atau kata umum panjang
      if (rawTerm.length >= 3 && rawTerm.length <= 40 && !/^(ini|itu|hal ini|mereka|kita|ia|dia|hal tersebut)\b/i.test(rawTerm)) {
        // Bersihkan term
        const cleanTerm = rawTerm.replace(/^(pada dasarnya|secara umum|dalam hal ini|adapun)\s+/i, '').trim();
        if (cleanTerm.length >= 3) {
          results.push({
            term: cleanTerm.charAt(0).toUpperCase() + cleanTerm.slice(1),
            definition: rawDef.charAt(0).toUpperCase() + rawDef.slice(1),
            fullSentence: trimmed
          });
        }
      }
    }
  }
  return results;
}

/**
 * Ekstraksi fungsi/peranan komponen (pola: "[Term] berfungsi/berperan/bertujuan untuk [Fungsi]")
 */
interface FunctionItem {
  subject: string;
  func: string;
  fullSentence: string;
}

function extractFunctions(sentences: string[]): FunctionItem[] {
  const results: FunctionItem[] = [];
  const regexFunc = /^([^,.()]+?)\s+(berfungsi|berperan|bertujuan|berguna|memiliki fungsi|bertugas)\s+(untuk|sebagai|dalam)?\s+([^.]{15,220})/i;

  for (const s of sentences) {
    const trimmed = s.trim();
    const match = trimmed.match(regexFunc);
    if (match) {
      const rawSubj = match[1].trim();
      const rawFunc = match[4]?.trim() || match[3]?.trim() || '';
      if (rawSubj.length >= 3 && rawSubj.length <= 40 && rawFunc.length >= 10 && !/^(ini|itu|hal ini|semua)\b/i.test(rawSubj)) {
        results.push({
          subject: rawSubj.charAt(0).toUpperCase() + rawSubj.slice(1),
          func: rawFunc.charAt(0).toUpperCase() + rawFunc.slice(1),
          fullSentence: trimmed
        });
      }
    }
  }
  return results;
}

/**
 * Ekstraksi hubungan sebab-akibat (pola: "karena / sehingga / mengakibatkan / menyebabkan")
 */
interface CauseEffectItem {
  causeOrEffect: string;
  fullSentence: string;
}

function extractCauseEffects(sentences: string[]): CauseEffectItem[] {
  const results: CauseEffectItem[] = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (/\b(karena|sehingga|mengakibatkan|menyebabkan|menghasilkan|disebabkan oleh)\b/i.test(trimmed)) {
      if (trimmed.length >= 35 && trimmed.length <= 220) {
        results.push({
          causeOrEffect: trimmed,
          fullSentence: trimmed
        });
      }
    }
  }
  return results;
}

/**
 * Ekstraksi daftar atau klasifikasi (pola: "terdiri atas / dibagi menjadi / antara lain / contohnya")
 */
interface ClassificationItem {
  topic: string;
  items: string;
  fullSentence: string;
}

function extractClassifications(sentences: string[]): ClassificationItem[] {
  const results: ClassificationItem[] = [];
  const regexClass = /^([^,.()]+?)\s+(terdiri atas|terbagi menjadi|dibagi menjadi|meliputi|antara lain|mencakup|contohnya)\s+([^.]{15,220})/i;

  for (const s of sentences) {
    const trimmed = s.trim();
    const match = trimmed.match(regexClass);
    if (match) {
      const topic = match[1].trim();
      const items = match[3].trim();
      if (topic.length >= 3 && topic.length <= 50 && items.length >= 10) {
        results.push({
          topic: topic.charAt(0).toUpperCase() + topic.slice(1),
          items: items.charAt(0).toUpperCase() + items.slice(1),
          fullSentence: trimmed
        });
      }
    }
  }
  return results;
}

/**
 * Ekstraksi paragraf narasi/bacaan berkualitas untuk dijadikan stimulus teks
 */
interface ReadingParagraph {
  text: string;
  keySentence: string;
  otherSentences: string[];
}

function extractReadingParagraphs(rawText: string): ReadingParagraph[] {
  const rawParagraphs = rawText
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length >= 120 && p.length <= 600 && !p.startsWith('===') && !p.startsWith('---'));

  const results: ReadingParagraph[] = [];
  for (const p of rawParagraphs) {
    const sentences = p.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(s => s.length >= 20);
    if (sentences.length >= 2) {
      results.push({
        text: p,
        keySentence: sentences[0],
        otherSentences: sentences.slice(1)
      });
    }
  }
  return results;
}

/**
 * Acak posisi opsi jawaban (A, B, C, D, E) agar kunci jawaban tersebar merata
 */
function shuffleOptionsAndSetKey(correctText: string, distractors: string[], isSMA: boolean = false): {
  opsi: { a: string; b: string; c: string; d: string; e?: string };
  kunci: 'a' | 'b' | 'c' | 'd' | 'e';
} {
  // Ambil 3 distractor unik untuk Paket A/B (4 opsi A-D), atau 4 distractor untuk SMA (5 opsi A-E)
  const maxDistractors = isSMA ? 4 : 3;
  const cleanDistractors = Array.from(new Set(distractors.filter(d => d && d.trim() !== correctText.trim())))
    .slice(0, maxDistractors);

  // Jika distractor kurang, buat variasi kontekstual
  while (cleanDistractors.length < maxDistractors) {
    const idx = cleanDistractors.length + 1;
    cleanDistractors.push(`Hanya berlaku pada kondisi tertentu yang tidak dijelaskan dalam teks materi`);
  }

  const allItems = [
    { text: correctText.trim(), isCorrect: true },
    ...cleanDistractors.map(d => ({ text: d.trim(), isCorrect: false }))
  ];

  // Fisher-Yates shuffle
  for (let i = allItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
  }

  const keys: ('a' | 'b' | 'c' | 'd' | 'e')[] = ['a', 'b', 'c', 'd', 'e'];
  let correctKey: 'a' | 'b' | 'c' | 'd' | 'e' = 'a';

  const opsi: any = {};
  allItems.forEach((item, index) => {
    const k = keys[index];
    opsi[k] = item.text;
    if (item.isCorrect) {
      correctKey = k;
    }
  });

  return { opsi, kunci: correctKey };
}

/**
 * Generator utama butir soal pilihan ganda berbasis RAG teks PDF asli
 */
export function generateQuestionsFromMateriText(options: GeneratePdfQuestionsOptions): GeneratedPdfExamResult {
  const {
    materiText,
    mapel,
    topik,
    temaModul,
    kelas,
    jumlahSoal = 20,
    tingkatKesulitan = 'sedang',
    images = []
  } = options;

  const cleanText = cleanPdfRawText(materiText || '');
  const cleanKelas = String(kelas).replace(/\D/g, '') || '4';
  const kNum = Number(cleanKelas);
  const isSMA = kNum >= 10 || String(kelas).toLowerCase().includes('paket c');

  // Deteksi topik utama dokumen jika user hanya memakai nama generik
  const detectedTopic = extractMainTopicFromPdfText(cleanText, topik || 'Materi Pembelajaran');
  const activeTopic = topik && topik !== 'Materi Pembelajaran' ? topik : detectedTopic;

  // Segmentasi kalimat dari teks dokumen
  const allSentences = cleanText
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length >= 25 && s.length <= 260 && !s.startsWith('---') && !s.startsWith('==='));

  // Ekstraksi fitur semantik dari dokumen
  const definitions = extractDefinitions(allSentences);
  const functions = extractFunctions(allSentences);
  const causeEffects = extractCauseEffects(allSentences);
  const classifications = extractClassifications(allSentences);
  const readingParagraphs = extractReadingParagraphs(cleanText);

  // Kumpulan istilah & kalimat penting untuk dijadikan bahan distraktor nyata dari dokumen yang sama
  const allTermsInDoc = Array.from(new Set([
    ...definitions.map(d => d.term),
    ...functions.map(f => f.subject),
    ...classifications.map(c => c.topic)
  ]));

  const allDefinitionsInDoc = definitions.map(d => d.definition);
  const allFunctionsInDoc = functions.map(f => f.func);

  const candidateQuestions: {
    pertanyaan: string;
    jawabanBenar: string;
    distraktor: string[];
    pembahasan: string;
  }[] = [];

  // ==========================================
  // TIPE 1: Soal Definisi Konsep Asli PDF
  // ==========================================
  definitions.forEach((defItem, idx) => {
    // Cari distraktor dari definisi lain dalam dokumen yang sama
    const otherDefs = allDefinitionsInDoc.filter(d => d !== defItem.definition);
    const distractors: string[] = [];
    if (otherDefs[0]) distractors.push(otherDefs[0]);
    if (otherDefs[1]) distractors.push(otherDefs[1]);
    if (otherDefs[2]) distractors.push(otherDefs[2]);

    // Jika distraktor kurang, buat variasi inversi/kontradiksi berdasarkan istilah dokumen
    while (distractors.length < (isSMA ? 4 : 3)) {
      const altTerm = allTermsInDoc[distractors.length] || 'proses alami lainnya';
      distractors.push(`Kondisi perubahan yang terjadi pada ${altTerm} di luar siklus normal`);
    }

    candidateQuestions.push({
      pertanyaan: `Berdasarkan teks materi yang dibahas, apa yang dimaksud dengan ${defItem.term}?`,
      jawabanBenar: defItem.definition,
      distraktor: distractors,
      pembahasan: `Berdasarkan dokumen materi: "${defItem.fullSentence}".`
    });
  });

  // ==========================================
  // TIPE 2: Soal Fungsi / Peran Komponen Asli PDF
  // ==========================================
  functions.forEach((funcItem, idx) => {
    const otherFuncs = allFunctionsInDoc.filter(f => f !== funcItem.func);
    const distractors: string[] = [];
    if (otherFuncs[0]) distractors.push(otherFuncs[0]);
    if (otherFuncs[1]) distractors.push(otherFuncs[1]);
    if (otherFuncs[2]) distractors.push(otherFuncs[2]);

    while (distractors.length < (isSMA ? 4 : 3)) {
      const altTerm = allTermsInDoc[distractors.length] || 'sistem lingkungan';
      distractors.push(`Menghambat aktivitas perkembangan alami pada ${altTerm}`);
    }

    candidateQuestions.push({
      pertanyaan: `Menurut penjelasan materi, apa fungsi atau peranan utama dari ${funcItem.subject}?`,
      jawabanBenar: funcItem.func,
      distraktor: distractors,
      pembahasan: `Berdasarkan dokumen materi: "${funcItem.fullSentence}".`
    });
  });

  // ==========================================
  // TIPE 3: Soal Klasifikasi / Bagian / Contoh Asli PDF
  // ==========================================
  classifications.forEach((clsItem, idx) => {
    const otherItems = classifications.filter(c => c.items !== clsItem.items).map(c => c.items);
    const distractors: string[] = [];
    if (otherItems[0]) distractors.push(otherItems[0]);
    if (otherItems[1]) distractors.push(otherItems[1]);
    if (otherItems[2]) distractors.push(otherItems[2]);

    while (distractors.length < (isSMA ? 4 : 3)) {
      distractors.push(`Komponen pelengkap yang tidak termasuk dalam pengelompokan materi`);
    }

    candidateQuestions.push({
      pertanyaan: `Berikut ini yang merupakan bagian, jenis, atau komponen dari ${clsItem.topic} sesuai materi bacaan adalah...`,
      jawabanBenar: clsItem.items,
      distraktor: distractors,
      pembahasan: `Berdasarkan dokumen materi: "${clsItem.fullSentence}".`
    });
  });

  // ==========================================
  // TIPE 4: Soal Hubungan Sebab-Akibat & Proses
  // ==========================================
  causeEffects.forEach((ceItem, idx) => {
    const otherSentences = allSentences.filter(s => s !== ceItem.fullSentence);
    const distractors: string[] = [];
    if (otherSentences[0]) distractors.push(otherSentences[0]);
    if (otherSentences[1]) distractors.push(otherSentences[1]);
    if (otherSentences[2]) distractors.push(otherSentences[2]);

    while (distractors.length < (isSMA ? 4 : 3)) {
      distractors.push(`Peristiwa tersebut berlangsung secara spontan tanpa dipengaruhi faktor apa pun`);
    }

    candidateQuestions.push({
      pertanyaan: `Manakah pernyataan yang paling benar mengenai proses atau sebab-akibat berikut berdasarkan materi pembelajaran?`,
      jawabanBenar: ceItem.causeOrEffect,
      distraktor: distractors,
      pembahasan: `Berdasarkan fakta teks dokumen: "${ceItem.fullSentence}".`
    });
  });

  // ==========================================
  // TIPE 5: Soal Stimulus Kutipan Teks Dokumen (Reading Comprehension)
  // ==========================================
  readingParagraphs.forEach((para, idx) => {
    const excerpt = para.text.length > 280 ? para.text.slice(0, 275) + '...' : para.text;
    const correctStatement = para.keySentence;

    const otherSentences = allSentences.filter(s => s !== para.keySentence && !para.text.includes(s));
    const distractors: string[] = [];
    if (otherSentences[0]) distractors.push(otherSentences[0]);
    if (otherSentences[1]) distractors.push(otherSentences[1]);
    if (otherSentences[2]) distractors.push(otherSentences[2]);

    while (distractors.length < (isSMA ? 4 : 3)) {
      distractors.push(`Informasi pada teks menyatakan hal yang berlawanan dengan fakta yang ada`);
    }

    candidateQuestions.push({
      pertanyaan: `Perhatikan kutipan materi pembelajaran berikut!\n\n"${excerpt}"\n\nBerdasarkan kutipan teks di atas, informasi yang paling tepat disampaikan adalah...`,
      jawabanBenar: correctStatement,
      distraktor: distractors,
      pembahasan: `Berdasarkan kutipan teks pada dokumen materi: "${para.keySentence}".`
    });
  });

  // ==========================================
  // TIPE 6: Kalimat Fakta Dokumen Lainnya (Jika Butir Masih Kurang)
  // ==========================================
  if (candidateQuestions.length < jumlahSoal) {
    const remainingSentences = allSentences.filter(s => 
      !candidateQuestions.some(cq => cq.pembahasan.includes(s.slice(0, 40)))
    );

    remainingSentences.forEach((sentence, sIdx) => {
      if (candidateQuestions.length >= jumlahSoal * 1.5) return;
      const otherSentences = allSentences.filter((_, idx) => idx !== sIdx);
      const distractors = [
        otherSentences[0] || `Fakta tersebut berlawanan dengan penjelasan pokok materi`,
        otherSentences[1] || `Kondisi tersebut tidak memiliki hubungan dengan konsep ${activeTopic}`,
        otherSentences[2] || `Hanya terjadi pada keadaan khusus tanpa keterlibatan ${activeTopic}`
      ];

      candidateQuestions.push({
        pertanyaan: `Berdasarkan uraian materi "${activeTopic}", manakah pernyataan yang paling benar?`,
        jawabanBenar: sentence,
        distraktor: distractors,
        pembahasan: `Berdasarkan fakta dokumen materi: "${sentence}".`
      });
    });
  }

  // Jika teks PDF sangat pendek atau minim kalimat, gunakan topik materi spesifik
  if (candidateQuestions.length === 0) {
    candidateQuestions.push({
      pertanyaan: `Berdasarkan pokok materi ${activeTopic} (${mapel} Kelas ${kelas}), konsep utama yang dipelajari membahas tentang...`,
      jawabanBenar: `Pemahaman mendalam mengenai prinsip dan fakta konsep ${activeTopic} sesuai capaian pembelajaran`,
      distraktor: [
        `Konsep yang tidak memiliki keterkaitan dengan mata pelajaran ${mapel}`,
        `Asumsi teori yang belum teruji kebenarannya dalam kurikulum`,
        `Pembahasan di luar cakupan materi kelas ${kelas}`
      ],
      pembahasan: `Konsep pokok materi ${activeTopic} disusun berdasarkan Capaian Pembelajaran Kurikulum Merdeka ${mapel}.`
    });
  }

  // Targetkan jumlah soal yang diminta (misal 20)
  const targetCount = Math.min(Math.max(jumlahSoal, 3), candidateQuestions.length);
  const selectedPool = candidateQuestions.slice(0, targetCount);

  // Buat butir SoalPilihanGanda lengkap dengan pengacakan opsi dan stimulus gambar jika ada
  const finalQuestions: SoalPilihanGanda[] = selectedPool.map((item, index) => {
    const { opsi, kunci } = shuffleOptionsAndSetKey(item.jawabanBenar, item.distraktor, isSMA);

    return {
      id: index + 1,
      mapel,
      Mapel: mapel,
      kelas: String(kelas),
      Kelas: String(kelas),
      pertanyaan: item.pertanyaan,
      tipe: 'Pilihan Ganda',
      opsi,
      kunci,
      bobot: 5,
      pembahasan: item.pembahasan
    };
  });

  const ringkasan = `Dokumen materi "${activeTopic}" (${mapel} Kelas ${kelas}) berhasil dianalisis. Menghasilkan ${finalQuestions.length} butir soal pilihan ganda berstimulus teks asli dokumen (${definitions.length} konsep definisi, ${functions.length} fungsi/peran, ${classifications.length} pengelompokan/bagian, dan ${readingParagraphs.length} kutipan paragraf bacaan).`;

  return {
    soalList: finalQuestions,
    ringkasanDokumen: ringkasan,
    topikUtama: activeTopic,
    totalEkstraksi: candidateQuestions.length
  };
}
