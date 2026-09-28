import * as XLSX from 'xlsx';
import { calculateSmartWeight } from '../utils/smartBobotHelper';

export const GOOGLE_DRIVE_MODUL_FOLDER_ID = '1xaf825icvAaXO7T1YtxjbWQQw-sud_t0';
export const GOOGLE_DRIVE_MODUL_FOLDER_URL = 'https://drive.google.com/drive/folders/1xaf825icvAaXO7T1YtxjbWQQw-sud_t0';

export interface SoalPilihanGanda {
  id: number;
  nomorSoal?: number;
  mapel?: string;
  Mapel?: string;
  MataPelajaran?: string;
  'Mata Pelajaran'?: string;
  kelas?: string;
  Kelas?: string;
  jenjang?: string;
  Jenjang?: string;
  pertanyaan: string;
  tipe: 'Pilihan Ganda';
  opsi: {
    a: string;
    b: string;
    c: string;
    d: string;
    e?: string;
  };
  kunci: 'a' | 'b' | 'c' | 'd' | 'e';
  bobot: number;
  pembahasan: string;
  gambar?: string;
  gambarUrl?: string;
  imageUrl?: string;
  LinkGambar?: string;
  'Link Gambar'?: string;
}

export interface BankSoalPackage {
  id: string;
  BankSoalID: string;
  mapel: string;
  Mapel: string;
  kelas: string;
  Kelas: string;
  kurikulum: string;
  Kurikulum: string;
  guru: string;
  Guru: string;
  jumlahSoal: number;
  JumlahSoal: number;
  tipeSoal: string;
  TipeSoal: string;
  kesulitan: string;
  Kesulitan: string;
  status: string;
  Status: string;
  createdAt: string;
  updatedAt: string;
  topik: string;
  temaModul: string;
  kodeSubTugas: string;
  silabusNo?: number;
  SilabusNo?: number;
  jenisUjian?: string;
  JenisUjian?: string;
  jenisAsesmen?: string;
  JenisAsesmen?: string;
  durasi?: number;
  Durasi?: number;
  durasiMenit?: number;
  DurasiMenit?: number;
  semester?: string;
  Semester?: string;
  jadwalId?: string;
  sesiId?: string;
  soalList: SoalPilihanGanda[];
}

export const MAIN_SUBJECTS = [
  'Pendidikan Agama dan Budi Pekerti',
  'Pendidikan Pancasila / Kewarganegaraan',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam',
  'Ilmu Pengetahuan Sosial',
  'Pendidikan Jasmani Olahraga dan Kesehatan',
  'Bahasa Inggris'
];

export const COMPREHENSIVE_SUBJECTS = [
  'Pendidikan Agama dan Budi Pekerti',
  'Pendidikan Pancasila / Kewarganegaraan',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam',
  'Ilmu Pengetahuan Sosial',
  'Pendidikan Jasmani Olahraga dan Kesehatan',
  'Bahasa Inggris',
  'Pendidikan Lingkungan dan Budaya Jakarta',
  'Baca Tulis',
  'Teknologi Informasi dan Komunikasi',
  'Ujian Praktek',
  'Ujian Vokasi',
  'Seni Budaya',
  'Prakarya',
  'Pemberdayaan',
  'Sejarah',
  'Sejarah Indonesia',
  'Geografi',
  'Ekonomi',
  'Sosiologi'
];

// Clean a single concept title from code, module, unit, index prefixes, and action verbs
export function cleanIndividualConcept(raw: string): string {
  if (!raw) return '';
  let s = String(raw).trim();
  // Strip syllabus code prefixes e.g. "A4 - PAI - MODUL 1 - 2 ", "A4 - PAI - MODUL 1 - 1 -", "B7 - PPKn - MODUL 3 -"
  s = s.replace(/^[A-Z]\d+\s*-\s*[A-Z]+\s*-\s*MODUL\s*\d+\s*-\s*(\d+\s*-?)?/gi, '');
  s = s.replace(/^[A-Z0-9]+(\s*-\s*[A-Z0-9]+)*\s*-\s*/i, '');
  s = s.replace(/\b[A-Z]{2,5}-\d{1,2}-\d{1,2}\b/gi, '');
  s = s.replace(/\bSUB-\d{1,3}\b/gi, '');

  // Strip (1): or (2): or 1. or [1]
  s = s.replace(/^\s*(\(\d+\)|\d+[\.\)]|\[\d+\]|\d+:)\s*[:\-–—]?\s*/gi, '');
  s = s.replace(/\(\d+\)\s*[:\-–—]?\s*/gi, '');

  // Strip Modul X (Unit Y): or Modul X:
  s = s.replace(/\bmodul\s*\d*(\s*\([^)]*\))?\s*[:\-–—]?\s*/gi, '');
  s = s.replace(/\b(bab\s*\d*|unit\s*\d*|sub-?modul\s*\d*|topik\s*bahasan|topik|materi\s*pembelajaran|materi\s*pokok|materi|tema|sub-tema|sub-topik|subtopik|judul)\s*[:\-–—]?\s*/gi, '');

  // Strip action verbs and syllabus headings at the beginning
  s = s.replace(/^(mengkaji|membahas|memahami|mempelajari|menyimak|menganalisis|menelaah|mengenal|menjelaskan|mengidentifikasi|menyambut|meneladani|menerapkan|indahnya)\s+/gi, '');
  s = s.replace(/^(teladan\s+mulia|teladan)\s+/gi, '');

  s = s.replace(/["“”'']/g, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

// Extract array of clean subtopics from a raw topic string that may contain multiple semicolon-separated items
export function extractSubTopics(raw: string): string[] {
  if (!raw) return [];
  const s = String(raw).trim();
  const rawParts = s.split(/;\s*|\n+|\(\d+\)\s*:\s*/);
  const cleaned = rawParts
    .map(p => cleanIndividualConcept(p))
    .filter(p => p.length >= 2 && !/^(pokok bahasan|materi|modul)$/i.test(p));

  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : [cleanIndividualConcept(s) || 'Pokok Bahasan'];
}

// Helper to clean topic / subject name
export function cleanConceptName(raw: string): string {
  if (!raw) return 'Pokok Bahasan';
  const subTopics = extractSubTopics(raw);
  if (subTopics.length === 0) return 'Pokok Bahasan';
  if (subTopics.length === 1) return subTopics[0];
  return subTopics.slice(0, 3).join(', ');
}

// Function to strictly remove all occurrences of "modul", "dalam materi...", "pada materi...", etc. from questions, options, and explanations
export function sanitizeNoModul(text: string): string {
  if (!text) return '';
  let s = String(text);

  // 0. Remove list numbering and syllabus code patterns: "(1):", "(2):", etc.
  s = s.replace(/\(\d+\):?\s*/g, '');
  s = s.replace(/;\s*\(\d+\):?/g, ', ');
  s = s.replace(/\b(dalam|pada)\s*\(\d+\)\s*[:\-–—]?\s*/gi, '');
  s = s.replace(/\b[A-Z]\d+\s*-\s*[A-Z]+\s*-\s*MODUL\s*\d+\s*-\s*\d+\s*-\s*/gi, '');

  // If a question accidentally includes a semicolon-separated list of multiple titles:
  s = s.replace(/(?:mengkaji\s+)?q\.s\.\s*al-[ḥh]ujur[āa]t\/49:13[;\s]+(?:teladan\s+mulia\s+)?asmaulhusna[;\s]+(?:indahnya\s+)?saling\s+menghargai[^\.;?]*[;\s]+(?:menyambut\s+)?usia\s+balig/gi, 'Pendidikan Agama Islam');

  // 1. Remove leading meta phrases
  s = s.replace(/^(menurut|berdasarkan|sesuai|pada|dalam)\s+(isi\s+)?(modul(\s+(ke-)?\d+)?|materi(\s+pembelajaran|\s+ajar|\s+bacaan|\s+teks|\s+ini)?)\s*(di\s+atas)?\s*[,:\-–—]?\s*/gi, '');
  s = s.replace(/^(menurut|berdasarkan|pada|dalam)\s+(bacaan|teks|uraian|penjelasan)\s*(ini|di\s+atas)?\s*[,:\-–—]?\s*/gi, '');

  // If question starts with "Dalam materi <Topik>, " -> strip meta prefix
  s = s.replace(/^(dalam|pada)\s+(materi|modul)\s+([^,]+?),\s*/gi, '');
  s = s.replace(/^(dalam|pada)\s+(materi|modul)\s*[,:\-–—]?\s*/gi, '');

  // 2. Remove mid-sentence meta references
  s = s.replace(/\b(sebagaimana\s+diajarkan|yang\s+diajarkan|yang\s+disampaikan|yang\s+dipelajari)\s+(dalam|pada)\s+(materi|modul)\s*/gi, 'tentang ');
  s = s.replace(/\b(dalam|pada)\s+(materi|modul)\s+(pembelajaran|ajar|ini)\b/gi, '');
  s = s.replace(/\b(dalam|pada)\s+(materi|modul)\s+(adalah|yang|merupakan)\b/gi, '$3');
  s = s.replace(/\b(dalam|pada)\s+(materi|modul)\s+/gi, 'pada ');
  s = s.replace(/\b(dalam|pada)\s+(materi|modul)\b/gi, '');
  s = s.replace(/\b(berdasarkan|menurut)\s+(materi|modul)\s+/gi, 'menurut ');
  s = s.replace(/\b(terkait|sesuai)\s+(materi|modul)\s+/gi, 'tentang ');
  s = s.replace(/\b(isi\s+modul|isi\s+materi)\b/gi, 'pokok bahasan');
  s = s.replace(/\b(buku\s+modul|buku\s+materi|bab\s+modul)\b/gi, 'buku pelajaran');
  s = s.replace(/\b(modul\s+ajar|modul\s+pembelajaran|modul(\s+(ke-)?\d+)?)\b/gi, 'pokok bahasan');
  s = s.replace(/\b(modul)\b/gi, '');

  // 3. Clean up formatting
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/\s*([,;:\-–—])\s*\1+/g, '$1');
  s = s.replace(/^[,;:\-–—\s]+/, '');
  s = s.trim();
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

/**
 * Generate 20 authentic, pedagogical multiple-choice questions tailored to a specific topic and subject
 * Berlandaskan Taksonomi Bloom (C1-C4) & Capaian Pembelajaran (CP/TP) Kurikulum Merdeka
 */
export function generate20SoalPilihanGanda(params: {
  mapel: string;
  topik: string;
  tema?: string;
  kelas?: string;
  paket?: string;
  subKe?: string;
  kodeSubTugas?: string;
}): SoalPilihanGanda[] {
  const { mapel, topik, tema = '', kelas = '4', paket = 'A' } = params;
  const isSMA = paket === 'C' || ['10', '11', '12'].includes(String(kelas).replace(/\D/g, ''));
  const subTopics = extractSubTopics(topik);
  const cleanName = subTopics[0] || cleanIndividualConcept(topik);
  const cleanTema = cleanConceptName(tema) || 'Kurikulum Merdeka';
  const m = (mapel || '').toLowerCase();
  const rawTopikLower = (topik || '').toLowerCase();

  const generatedItems: { q: string; opts: string[]; exp: string }[] = [];

  if (m.includes('agama') || m.includes('islam') || m.includes('pai') || m.includes('quran') || m.includes('budi pekerti') || rawTopikLower.includes('hujurat') || rawTopikLower.includes('asmaul') || rawTopikLower.includes('balig')) {
    // 1. Q.S. Al-Hujurat 13 questions
    if (rawTopikLower.includes('hujurat') || rawTopikLower.includes('q.s') || rawTopikLower.includes('surat') || rawTopikLower.includes('ayat') || subTopics.some(t => /hujurat|q\.s|ayat|surah/i.test(t))) {
      generatedItems.push(
        {
          q: `Pesan pokok yang terkandung dalam Surah Al-Hujurat ayat 13 mengenai keberagaman manusia adalah...`,
          opts: [
            `Manusia diciptakan berbangsa-bangsa dan bersuku-suku agar saling mengenal (ta'aruf) dan hidup rukun`,
            `Manusia diciptakan berbeda-beda agar saling berselisih dan bermusuhan`,
            `Satu suku memiliki derajat kemuliaan lebih tinggi daripada suku lainnya`,
            `Perbedaan bahasa dan budaya menjadi alasan untuk saling menjauhi pergaulan`,
            `Manusia tidak perlu menghormati orang yang berasal dari daerah lain`
          ],
          exp: `Surah Al-Hujurat ayat 13 menegaskan bahwa keberagaman adalah ketetapan Allah SWT agar manusia saling mengenal (lita'arafu) dan saling menghormati.`
        },
        {
          q: `Menurut Surah Al-Hujurat ayat 13, ukuran kemuliaan seorang hamba di sisi Allah SWT ditentukan oleh...`,
          opts: [
            `Kadar ketakwaan, keimanan, dan amal saleh yang dilakukannya`,
            `Banyaknya harta kekayaan dan kemewahan yang dimilikinya`,
            `Tingginya status sosial dan garis keturunan keluarganya`,
            `Kekuatan fisik dan popularitas diri di masyarakat`,
            `Banyaknya pengikut dan pujian di media sosial`
          ],
          exp: `Allah SWT menegaskan 'Inna akramakum 'indallahi atqakum' (Sesungguhnya orang yang paling mulia di antara kamu di sisi Allah ialah orang yang paling bertakwa).`
        },
        {
          q: `Sikap seorang muslim di sekolah yang mencerminkan pengamalan Surah Al-Hujurat ayat 13 adalah...`,
          opts: [
            `Berteman dengan siapa saja tanpa membedakan suku, daerah, maupun status ekonomi`,
            `Hanya mau bergaul dengan teman yang berasal dari daerah yang sama`,
            `Menolak bekerja kelompok bersama teman yang berbeda logat bicara`,
            `Mengejek adat istiadat dan pakaian daerah teman lain`,
            `Membentuk kelompok pertemanan tertutup di ruang kelas`
          ],
          exp: `Menghargai keragaman teman tanpa membeda-bedakan latar belakang merupakan wujud nyata ketakwaan di sekolah.`
        }
      );
    }

    // 2. Asmaulhusna questions
    if (rawTopikLower.includes('asmaul') || rawTopikLower.includes('husna') || subTopics.some(t => /asmaul|husna/i.test(t))) {
      generatedItems.push(
        {
          q: `Makna dari Asmaulhusna bagi setiap orang yang beriman kepada Allah SWT adalah...`,
          opts: [
            `Nama-nama yang terbaik dan terindah yang hanya dimiliki oleh Allah SWT`,
            `Nama-nama malaikat yang bertugas mencatat amal perbuatan manusia`,
            `Gelar kehormatan untuk para nabi dan rasul yang wajib diimani`,
            `Nama-nama tempat suci umat Islam di seluruh dunia`,
            `Sebutan kehormatan bagi para pemimpin dan ulama`
          ],
          exp: `Asmaulhusna adalah nama-nama Allah SWT yang agung, baik, dan mencerminkan kesempurnaan sifat-sifat-Nya.`
        },
        {
          q: `Contoh sikap meneladani sifat Asmaulhusna Al-Quddus (Maha Suci) dalam kehidupan sehari-hari adalah...`,
          opts: [
            `Menjaga kebersihan badan, pakaian, tempat ibadah, serta menjaga hati dari sifat iri dengki`,
            `Membiarkan sampah berserakan di sekitar ruang kelas dan rumah`,
            `Mengotori sarana ibadah di musala atau masjid sekolah`,
            `Berkata kasar dan mencela kekurangan teman saat bermain`,
            `Menolak membersihkan lingkungan tempat tinggal bersama warga`
          ],
          exp: `Al-Quddus menuntut setiap muslim menjaga kesucian lahiriah (kebersihan diri dan lingkungan) serta kesucian batiniah (kebersihan hati).`
        },
        {
          q: `Sikap meneladani sifat Asmaulhusna As-Salam (Maha Sejahtera / Maha Menyelamatkan) tercermin dalam perilaku...`,
          opts: [
            `Senantiasa menebarkan salam, menjaga kedamaian, dan gemar tolong-menolong sesama`,
            `Mencari-cari kesalahan orang lain agar terjadi pertengkaran`,
            `Mendiamkan teman yang sedang ditimpa musibah kesusahan`,
            `Menyebarkan kabar yang belum tentu benar ke warga sekolah`,
            `Merasa paling hebat dan meremehkan salam orang lain`
          ],
          exp: `As-Salam mengajarkan kita menjadi pribadi pembawa kedamaian, keselamatan, dan ketenteraman bagi lingkungan sekitar.`
        },
        {
          q: `Sikap meneladani sifat Asmaulhusna Al-Malik (Maha Merajai / Menguasai) diwujudkan dengan cara...`,
          opts: [
            `Mampu mengendalikan hawa nafsu, bersikap rendah hati, dan memimpin diri sendiri dengan bijak`,
            `Bertindak sewenang-wenang kepada teman yang lebih lemah`,
            `Memaksa teman untuk menuruti segala perintah kita`,
            `Sombong karena memiliki kedudukan atau kekayaan lebih`,
            `Menolak mendengarkan usulan orang lain saat musyawarah`
          ],
          exp: `Meneladani Al-Malik berarti mampu menguasai nafsu diri, adil, bertanggung jawab, dan tidak bersikap otoriter.`
        }
      );
    }

    // 3. Saling Menghargai dalam Keragaman / Toleransi
    if (rawTopikLower.includes('menghargai') || rawTopikLower.includes('keragaman') || rawTopikLower.includes('toleran') || rawTopikLower.includes('perbedaan') || subTopics.some(t => /menghargai|keragaman|perbedaan|toleran/i.test(t))) {
      generatedItems.push(
        {
          q: `Sikap terpuji yang benar ketika menghadapi perbedaan suku, budaya, dan bahasa antarsesama adalah...`,
          opts: [
            `Menghormati perbedaan adat istiadat dan senantiasa menjaga kerukunan persaudaraan`,
            `Menganggap tradisi sukunya sendiri yang paling sempurna`,
            `Menertawakan pakaian adat daerah lain yang berbeda kebiasaan`,
            `Menolak bergaul jika tidak berasal dari suku yang sama`,
            `Memaksakan kebiasaan daerah sendiri kepada orang lain`
          ],
          exp: `Saling menghormati keragaman merupakan pilar persatuan bangsa dan wujud nyata akhlak mulia dalam pergaulan sosial.`
        },
        {
          q: `Tujuan mulia Allah SWT menciptakan manusia dalam berbagai suku dan bangsa adalah agar...`,
          opts: [
            `Saling mengenal, bekerja sama, dan tolong-menolong dalam kebaikan`,
            `Saling bersaing dan mencari kelemahan suku lain`,
            `Kelompok yang besar dapat menguasai kelompok yang kecil`,
            `Manusia hidup terpisah tanpa perlu menjalin komunikasi`,
            `Saling membanggakan kekayaan kelompok masing-masing`
          ],
          exp: `Keberagaman dimaksudkan agar manusia saling melengkapi, saling belajar, dan bekerja sama dalam mewujudkan kemaslahatan bersama.`
        },
        {
          q: `Contoh wujud nyata sikap toleransi antarumat beragama di lingkungan masyarakat adalah...`,
          opts: [
            `Memberikan ketenangan dan tidak mengganggu saat tetangga sedang melaksanakan ibadah`,
            `Mengadakan keributan di dekat rumah ibadah agama lain`,
            `Melarang orang lain merayakan hari besar keagamaannya`,
            `Memaksa tetangga untuk mengikuti keyakinan agama kita`,
            `Mengucilkan warga yang berbeda keyakinan di lingkungan RT`
          ],
          exp: `Toleransi beragama diwujudkan dengan saling menghormati kebebasan beribadah tanpa saling mengganggu dan mencampuri urusan ibadah masing-masing.`
        }
      );
    }

    // 4. Usia Balig questions
    if (rawTopikLower.includes('balig') || rawTopikLower.includes('baligh') || rawTopikLower.includes('dewasa') || subTopics.some(t => /balig|baligh/i.test(t))) {
      generatedItems.push(
        {
          q: `Pengertian usia balig dalam ajaran Islam menandakan bahwa seseorang telah...`,
          opts: [
            `Mencapai kedewasaan fisik dan mulai memikul tanggung jawab penuh menjalankan syariat agama (mukallaf)`,
            `Bebas dari segala kewajiban ibadah dan tata tertib hidup`,
            `Tidak perlu lagi mendengarkan nasihat orang tua dan bimbingan guru`,
            `Selesai menuntut ilmu dan tidak perlu belajar lagi di sekolah`,
            `Boleh meninggalkan salat fardu lima waktu tanpa rasa bersalah`
          ],
          exp: `Balig menandai awal fase mukallaf, yaitu individu yang telah dibebani kewajiban syariat untuk beribadah dan mempertanggungjawabkan perbuatannya.`
        },
        {
          q: `Tanda fisik seseorang telah memasuki usia balig menurut pandangan ilmu biologi dan syariat Islam antara lain...`,
          opts: [
            `Mengalami mimpi basah (ihtilam) bagi laki-laki dan mengalami haid bagi perempuan`,
            `Pertumbuhan fisik berhenti total sejak masa kanak-kanak`,
            `Gigi susu belum ada yang tanggal sama sekali`,
            `Daya ingat dan kecerdasan berpikir menurun drastis`,
            `Kembali memiliki sifat kekanak-kanakan seperti usia balita`
          ],
          exp: `Tanda balig secara biologis dan fikih adalah keluarnya mani/ihtilam bagi laki-laki dan haid bagi perempuan, atau telah mencapai batas usia tertentu.`
        },
        {
          q: `Kewajiban ibadah yang wajib dikerjakan secara mandiri setelah seseorang memasuki usia balig adalah...`,
          opts: [
            `Menunaikan salat fardu lima waktu dan menjalankan ibadah puasa di bulan Ramadan`,
            `Hanya melaksanakan salat jika disuruh oleh guru atau orang tua`,
            `Boleh menunda salat fardu sampai masa tua nanti`,
            `Hanya berbuat baik tanpa perlu melaksanakan kewajiban salat`,
            `Meninggalkan puasa Ramadan meski tidak ada halangan syar'i`
          ],
          exp: `Setelah balig, setiap muslim wajib menunaikan salat fardu lima waktu dan puasa Ramadan tanpa boleh diabaikan.`
        },
        {
          q: `Sikap terpuji yang harus dimiliki seorang anak yang telah memasuki usia balig adalah...`,
          opts: [
            `Menjaga aurat, menjaga pergaulan secara sopan, serta bertanggung jawab atas ucapan dan perilakunya`,
            `Bebas bergaul tanpa memedulikan batasan aurat dan etika`,
            `Membantah nasihat kebaikan yang disampaikan oleh orang tua`,
            `Mengabaikan kebersihan diri setelah buang air atau berhadas`,
            `Mencari-cari alasan untuk meninggalkan salat berjemaah`
          ],
          exp: `Siswa yang telah balig dituntut menjaga batasan aurat, adab pergaulan islami, dan kebersihan diri dari hadas kecil maupun besar.`
        }
      );
    }

    // Baseline questions for PAI
    generatedItems.push(
      {
        q: `Sikap pengamalan terpuji seorang muslim dalam kehidupan sehari-hari adalah...`,
        opts: [
          `Bersikap jujur, amanah, santun, dan senantiasa tolong-menolong`,
          `Merasa paling benar sendiri dan meremehkan orang lain`,
          `Hanya berbuat baik jika dilihat dan dipuji oleh guru`,
          `Membeda-bedakan teman berdasarkan suku dan kekayaan`,
          `Menolak bekerja sama dalam kegiatan bakti sosial sekolah`
        ],
        exp: `Pengamalan ajaran Islam diwujudkan melalui akhlak terpuji seperti jujur, rendah hati, dan peduli sesama.`
      },
      {
        q: `Hukum mempelajari dan mengamalkan nilai-nilai kebaikan bagi setiap muslim adalah...`,
        opts: [
          `Wajib dan bernilai pahala berlimpah di sisi Allah SWT`,
          `Dilarang karena memberatkan aktivitas belajar sehari-hari`,
          `Boleh ditinggalkan tanpa alasan yang jelas dan dibenarkan`,
          `Hanya diwajibkan bagi orang yang sudah berusia lanjut`,
          `Tidak memiliki pengaruh bagi ketenangan hati dan keselamatan`
        ],
        exp: `Menuntut ilmu dan mengamalkan kebajikan merupakan kewajiban yang mendatangkan keberkahan hidup di dunia dan akhirat.`
      },
      {
        q: `Contoh perilaku nyata yang mencerminkan rasa syukur atas nikmat Allah SWT adalah...`,
        opts: [
          `Menggunakan waktu sehat dan akal pikiran untuk giat belajar dan rajin beribadah`,
          `Mengeluh setiap kali mendapat tugas latihan dari bapak atau ibu guru`,
          `Membuang sisa makanan yang masih bersih dan layak dikonsumsi`,
          `Menyimpan ilmu sendiri tanpa mau berdiskusi dengan teman sekelas`,
          `Memamerkan kepandaian agar dipuji dan disegani banyak orang`
        ],
        exp: `Syukur sejati diwujudkan dengan memanfaatkan seluruh nikmat Allah SWT untuk taat beribadah dan memberi manfaat bagi sesama.`
      },
      {
        q: `Tujuan Allah SWT menurunkan petunjuk agama dan wahyu-Nya kepada umat manusia adalah agar manusia...`,
        opts: [
          `Memperoleh keselamatan, ketenteraman jiwa, dan kebahagiaan di dunia serta akhirat`,
          `Dapat saling berselisih dan bermusuhan satu sama lain`,
          `Terbebas dari aturan sopan santun dan tata tertib bermasyarakat`,
          `Mengejar kesenangan semata tanpa memedulikan kepentingan orang lain`,
          `Menjadi pribadi yang sombong atas setiap prestasi yang diraih`
        ],
        exp: `Petunjuk agama membimbing jalan hidup manusia menuju keselamatan, keharmonisan sosial, dan kebahagiaan sejati.`
      },
      {
        q: `Adab yang baik saat berdoa dan memohon pertolongan kepada Allah SWT adalah...`,
        opts: [
          `Berdoa dengan hati yang ikhlas, khusyuk, bersuara lembut, dan penuh pengharapan`,
          `Berteriak-teriak dengan nada suara yang keras dan membentak`,
          `Berdoa sambil bercanda dan menertawakan teman di sampingnya`,
          `Merasa bahwa doa pasti langsung dikabulkan tanpa perlu berusaha`,
          `Cepat berputus asa jika keinginannya belum terwujud seketika`
        ],
        exp: `Adab berdoa mencakup keikhlasan hati, kekhusyukan jiwa, rasa harap cemas (khauf wa raja'), dan bersuara santun.`
      },
      {
        q: `Manfaat membiasakan sikap gemar tolong-menolong dalam kebajikan di lingkungan sekolah adalah...`,
        opts: [
          `Mempererat tali persaudaraan, menciptakan kerukunan, dan meringankan beban teman`,
          `Menimbulkan kecemburuan sosial di antara sesama siswa`,
          `Membuat kita merasa berhak meminta imbalan uang dari teman`,
          `Mengurangi semangat belajar teman yang ditolong`,
          `Menimbulkan perpecahan dan perselisihan di ruang kelas`
        ],
        exp: `Tolong-menolong (ta'awun) dalam kebaikan menumbuhkan rasa kasih sayang dan memperkuat persaudaraan di lingkungan sekolah.`
      },
      {
        q: `Sikap jujur (siddiq) dalam pergaulan di sekolah dapat dicontohkan melalui perbuatan...`,
        opts: [
          `Mengerjakan ujian dengan mandiri tanpa menyontek pekerjaan teman`,
          `Menyalin tugas PR teman sebelum bel masuk kelas berbunyi`,
          `Menyembunyikan barang temuan di laci meja tanpa melapor ke guru`,
          `Mengarang alasan palsu saat terlambat datang ke sekolah`,
          `Menyalahkan teman atas kekeliruan yang kita lakukan sendiri`
        ],
        exp: `Kejujuran dalam belajar seperti tidak menyontek merupakan fondasi utama pembentukan karakter siswa yang berintegritas.`
      }
    );
  } else if (m.includes('bahasa') || m.includes('indonesia') || m.includes('inggris') || m.includes('sastra')) {
    generatedItems.push(
      {
        q: `Tujuan utama membaca teks secara intensif adalah...`,
        opts: [
          `Memahami gagasan pokok, kosakata baru, dan pesan yang disampaikan penulis`,
          `Membaca secepat mungkin tanpa memahami arti kata-katanya`,
          `Hanya menghafal nomor halaman buku tanpa membaca isinya`,
          `Mengubah jalan cerita secara sembarangan tanpa membaca teks asli`,
          `Mencari kata-kata yang sulit untuk membingungkan teman`
        ],
        exp: `Membaca bertujuan untuk menemukan gagasan pokok, memperkaya kosakata, dan menangkap pesan bacaan.`
      },
      {
        q: `Ciri kalimat yang baik dan efektif dalam tulisan adalah...`,
        opts: [
          `Disusun secara runtut, memiliki subjek dan predikat yang jelas, serta mudah dipahami`,
          `Menggunakan kata-kata yang berbelit-belit dan artinya tidak jelas`,
          `Tidak memiliki unsur subjek sehingga pembaca merasa bingung`,
          `Memuat banyak kata serapan yang tidak sesuai kaidah ejaan baku`,
          `Sangat panjang hingga maknanya menjadi tidak beraturan`
        ],
        exp: `Kalimat efektif memiliki struktur gramatikal yang jelas (minimal Subjek dan Predikat) serta lugas.`
      },
      {
        q: `Langkah yang tepat untuk menemukan ide pokok sebuah paragraf adalah...`,
        opts: [
          `Membaca kalimat utama yang biasanya terletak di awal atau akhir paragraf`,
          `Hanya membaca kata terakhir pada baris paling bawah teks`,
          `Menghitung jumlah seluruh huruf vokal di dalam paragraf`,
          `Mengabaikan judul dan langsung menebak isi teks bacaan`,
          `Menyalin seluruh paragraf tanpa menentukan inti pembahasannya`
        ],
        exp: `Ide pokok paragraf termuat dalam kalimat utama yang didukung oleh kalimat-kalimat penjelas.`
      },
      {
        q: `Manfaat menyampaikan pendapat secara santun dalam diskusi adalah...`,
        opts: [
          `Pesan dapat diterima dengan baik oleh pendengar tanpa menyinggung perasaan`,
          `Membuat suasana diskusi menjadi panas dan penuh perdebatan`,
          `Memaksa semua orang agar harus sepakat dengan kemauan kita`,
          `Menghentikan orang lain yang ingin menyampaikan pendapatnya`,
          `Menunjukkan bahwa kita lebih berkuasa daripada peserta lain`
        ],
        exp: `Komunikasi yang santun dan beretika mempermudah penerimaan gagasan dan menjaga kerukunan antarsesama.`
      },
      {
        q: `Sikap yang baik ketika menyimak orang lain berbicara adalah...`,
        opts: [
          `Mendengarkan dengan sungguh-sungguh, mencatat poin penting, dan tidak memotong pembicaraan`,
          `Berbicara sendiri dengan teman sebangku saat guru menjelaskan`,
          `Langsung memotong pembicaraan sebelum orang lain selesai berbicara`,
          `Mengabaikan penjelasan pembicara dan sibuk melamun`,
          `Menertawakan kesalahan pengucapan kata yang dilakukan teman`
        ],
        exp: `Keterampilan menyimak menuntut konsentrasi, pencatatan informasi inti, serta etika menghargai pembicara.`
      }
    );
  } else if (m.includes('matematika') || m.includes('mtk') || m.includes('hitung') || m.includes('aljabar')) {
    generatedItems.push(
      {
        q: `Konsep dasar yang sangat penting dipahami saat menyelesaikan perhitungan adalah...`,
        opts: [
          `Memahami urutan langkah perhitungan logis dan nilai tempat bilangan dengan tepat`,
          `Hanya menghafal jawaban tanpa memahami cara atau proses perhitungannya`,
          `Menulis angka sembarangan pada lembar jawaban tanpa diteliti`,
          `Menghindari pengerjaan soal hitungan yang memiliki angka pecahan`,
          `Mengabaikan tanda operasi hitung seperti tambah, kurang, kali, dan bagi`
        ],
        exp: `Matematika bertumpu pada pemahaman konsep operasi hitung, ketelitian penalaran, dan logika bertahap.`
      },
      {
        q: `Langkah awal yang tepat saat menyelesaikan soal cerita matematika adalah...`,
        opts: [
          `Menentukan apa yang diketahui, apa yang ditanyakan, lalu membuat model matematikanya`,
          `Langsung mengalikan semua angka yang terlihat di dalam soal cerita`,
          `Menebak hasil akhir tanpa membaca kalimat soal dengan cermat`,
          `Melewati soal karena merasa kalimat ceritanya terlalu panjang`,
          `Menjumlahkan angka terbesar dengan angka terkecil secara acak`
        ],
        exp: `Penyelesaian soal cerita membutuhkan tahapan analisis: diketahui, ditanyakan, rumus model, dan perhitungan.`
      },
      {
        q: `Manfaat mempelajari konsep hitungan dalam aktivitas kehidupan kita sehari-hari adalah...`,
        opts: [
          `Membantu menghitung biaya belanja, menakar kebutuhan, dan mengukur jarak secara akurat`,
          `Membuat kita enggan mengatur uang saku dengan cermat`,
          `Hanya berguna saat berada di dalam ruangan kelas saja`,
          `Tidak memiliki kegunaan praktis di luar jam pelajaran sekolah`,
          `Menghabiskan waktu luang tanpa memberikan ketelitian berpikir`
        ],
        exp: `Aplikasi matematika sangat luas: transaksi jual beli, pengelolaan anggaran, estimasi waktu, dan pengukuran fisik.`
      }
    );
  } else if (m.includes('ipa') || m.includes('ipas') || m.includes('sains') || m.includes('alam') || m.includes('biologi')) {
    generatedItems.push(
      {
        q: `Ciri utama penjelasan ilmiah dalam mempelajari peristiwa alam adalah...`,
        opts: [
          `Berdasarkan fakta hasil pengamatan, pembuktian objektif, dan penalaran logis`,
          `Berdasarkan cerita mitos yang turun-temurun tanpa bukti nyata`,
          `Mengikuti dugaan acak yang tidak dapat diuji kebenarannya`,
          `Hanya mengandalkan perasaan pribadi tanpa melakukan pengamatan`,
          `Menolak penggunaan alat ukur dan data laboratorium`
        ],
        exp: `Sains berlandaskan metode ilmiah: observasi, hipotesis, eksperimen, dan penarikan kesimpulan berbasis fakta.`
      },
      {
        q: `Fungsi utama bagian tubuh makhluk hidup diciptakan oleh Tuhan Yang Maha Esa adalah...`,
        opts: [
          `Menunjang kelangsungan hidup, beradaptasi dengan lingkungan, dan berkembang biak`,
          `Memberatkan gerakan tubuh saat mencari makanan di alam`,
          `Menghalangi interaksi sosial dengan sesama kelompoknya`,
          `Menyebabkan gangguan fungsi pada organ tubuh lainnya`,
          `Menghentikan proses metabolisme dan pernapasan tubuh`
        ],
        exp: `Setiap organ makhluk hidup beradaptasi untuk menjalankan fungsi spesifik demi menjaga kelangsungan hidup.`
      },
      {
        q: `Tindakan nyata yang mencerminkan kepedulian menjaga kelestarian lingkungan alam di sekolah adalah...`,
        opts: [
          `Membuang sampah pada tempat yang tepat dan merawat tanaman taman sekolah`,
          `Memetik bunga dan merusak dahan tanaman hias di halaman sekolah`,
          `Membiarkan keran air wastafel mengalir terus-menerus hingga tumpah`,
          `Mencoret-coret batang pohon peneduh di sekitar lapangan`,
          `Membuang bungkus plastik makanan ke dalam saluran selokan`
        ],
        exp: `Menjaga kebersihan dan kelestarian ekosistem sekolah merupakan tanggung jawab bersama seluruh warga sekolah.`
      }
    );
  } else {
    // General subject templates
    generatedItems.push(
      {
        q: `Tujuan pokok dari mempelajari materi ini dengan sungguh-sungguh adalah...`,
        opts: [
          `Memperoleh pengetahuan bermanfaat, melatih keterampilan berpikir kritis, dan membentuk karakter mulia`,
          `Hanya untuk memperoleh nilai tinggi tanpa memahami manfaat isinya`,
          `Menghindari tugas-tugas latihan yang diberikan di ruang kelas`,
          `Menunjukkan kepandaian agar merasa lebih unggul daripada teman`,
          `Menghabiskan jam pelajaran tanpa memiliki tujuan belajar yang jelas`
        ],
        exp: `Belajar bertujuan membangun kompetensi pengetahuan, keterampilan bernalar, dan sikap positif dalam kehidupan sehari-hari.`
      },
      {
        q: `Sikap yang paling tepat saat mempelajari konsep baru yang belum dipahami adalah...`,
        opts: [
          `Bertanya kepada bapak/ibu guru dengan sopan dan tekun berlatih bersama teman`,
          `Langsung merasa putus asa dan tidak mau mencoba lagi`,
          `Menyalahkan teman kelompok atas ketidakpahaman materi`,
          `Mengabaikan materi dan sibuk bermain sendiri saat jam belajar`,
          `Menyontek jawaban teman tanpa mau membaca penjelasan di buku`
        ],
        exp: `Rasa ingin tahu dan kegigihan bertanya merupakan kunci utama meraih keberhasilan dan pemahaman belajar yang mendalam.`
      }
    );
  }

  // Ensure exactly 20 questions are generated
  const results: SoalPilihanGanda[] = [];
  const basePool = generatedItems.length > 0 ? generatedItems : [
    {
      q: `Konsep pokok yang dipelajari pada materi ini berkaitan dengan...`,
      opts: [
        `Pemahaman fakta mendasar, penerapan aturan, dan sikap saling menghormati`,
        `Informasi yang bertentangan dengan kebaikan bersama`,
        `Pendapat keliru tanpa disertai penjelasan yang jelas`,
        `Tindakan yang merugikan lingkungan sekitar`,
        `Gagasan yang mengabaikan ketertiban belajar`
      ],
      exp: `Materi pembelajaran menanamkan pemahaman konsep dasar dan pembiasaan akhlak terpuji.`
    }
  ];

  for (let i = 0; i < 20; i++) {
    const item = basePool[i % basePool.length];
    const optsObj: { a: string; b: string; c: string; d: string; e?: string } = {
      a: sanitizeNoModul(item.opts[0] || 'Pilihan A'),
      b: sanitizeNoModul(item.opts[1] || 'Pilihan B'),
      c: sanitizeNoModul(item.opts[2] || 'Pilihan C'),
      d: sanitizeNoModul(item.opts[3] || 'Pilihan D'),
      ...(isSMA ? { e: sanitizeNoModul(item.opts[4] || 'Pilihan E') } : {})
    };

    results.push({
      id: i + 1,
      pertanyaan: sanitizeNoModul(item.q),
      tipe: 'Pilihan Ganda',
      opsi: optsObj,
      kunci: 'a',
      bobot: 5,
      pembahasan: sanitizeNoModul(item.exp)
    });
  }

  return results;
}
/**
 * Creates a standard BankSoalPackage object from a Silabus row with 20 multiple choice questions
 */
export function createBankSoalPackageFromSilabus(r: any, defaultTeacher = 'Guru Mata Pelajaran'): BankSoalPackage {
  const mapel = r.mataPelajaran || r.NamaMapel || r.mapel || 'Mata Pelajaran';
  const topik = r.topikSubTugas || r.judulSubModul || r.topik || 'Materi Pembelajaran';
  const tema = r.temaModul || r.namaModulBab || 'Modul Pembelajaran';
  const kelas = String(r.kelas || '4').replace(/[A-Za-z]/g, '').trim() || '4';
  const paket = r.paket || (['4', '5', '6'].includes(kelas) ? 'A' : ['7', '8', '9'].includes(kelas) ? 'B' : 'C');
  const kodeSubTugas = r.kodeSubTugas || r.singkatanDanJudul || `SUB-${r.no || '01'}`;
  const bankId = `BNK-${paket}${kelas}-${String(r.no || Date.now()).padStart(3, '0')}`;

  const soal20 = generate20SoalPilihanGanda({
    mapel,
    topik,
    tema,
    kelas,
    paket,
    subKe: r.subKe,
    kodeSubTugas
  });

  const explicitJenis = r.jenisAsesmen || r.JenisAsesmen || r.jenisUjian || r.JenisUjian;
  let rawJenis = explicitJenis;
  if (!rawJenis) {
    const combinedStr = `${r.no || ''} ${r.topikSubTugas || ''} ${r.temaModul || ''} ${r.kodeSubTugas || ''} ${r.bentukAsesmen || ''} ${r.tipeAsesmen || ''}`.toUpperCase();
    if (combinedStr.includes('STS') || combinedStr.includes('TENGAH SEMESTER')) {
      rawJenis = 'Sumatif Tengah Semester (STS)';
    } else if (combinedStr.includes('SAS') || combinedStr.includes('AKHIR SEMESTER')) {
      rawJenis = 'Sumatif Akhir Semester (SAS)';
    } else if (combinedStr.includes('PAT') || combinedStr.includes('AKHIR TAHUN') || combinedStr.includes('SAT')) {
      rawJenis = 'Penilaian Akhir Tahun (PAT / SAT)';
    } else if (r.tipeAsesmen === 'FORMATIF' || combinedStr.includes('FORMATIF')) {
      rawJenis = 'Asesmen Formatif Harian';
    } else {
      // Default untuk penugasan & silabus modul (misal silabus 2210) adalah Sumatif Harian
      rawJenis = 'Sumatif Harian';
    }
  }

  return {
    id: bankId,
    BankSoalID: bankId,
    mapel,
    Mapel: mapel,
    kelas: kelas,
    Kelas: kelas,
    kurikulum: 'Kurikulum Merdeka',
    Kurikulum: 'Kurikulum Merdeka',
    jenisUjian: rawJenis,
    JenisUjian: rawJenis,
    jenisAsesmen: rawJenis,
    JenisAsesmen: rawJenis,
    durasi: 60,
    Durasi: 60,
    semester: r.semester || r.Semester || '1 (Ganjil)',
    Semester: r.semester || r.Semester || '1 (Ganjil)',
    guru: r.guru || defaultTeacher,
    Guru: r.guru || defaultTeacher,
    jumlahSoal: 20,
    JumlahSoal: 20,
    tipeSoal: 'Pilihan Ganda',
    TipeSoal: 'Pilihan Ganda',
    kesulitan: 'Sedang (50%)',
    Kesulitan: 'Sedang (50%)',
    status: 'Siap Digunakan',
    Status: 'Siap Digunakan',
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    topik,
    temaModul: tema,
    kodeSubTugas,
    silabusNo: r.no,
    SilabusNo: r.no,
    soalList: soal20
  };
}

/**
 * Mendeteksi apakah butir soal merupakan butir soal dummy / placeholder percobaan
 */
export function isDummyQuestion(q: any): boolean {
  if (!q) return true;
  const p = (q.pertanyaan || q.Pertanyaan || q.soal || q.q || '').trim();
  if (!p || p === '-' || p === '...') return true;

  const dummyPatterns = [
    /Berapakah hasil dari 15 x 6\?/i,
    /Ibu kota negara Indonesia saat ini/i,
    /^pertanyaan soal\s*\d+/i,
    /^soal dummy/i,
    /^test soal/i,
    /^sample question/i,
    /^dummy question/i,
    /^contoh butir soal/i,
    /^lorem ipsum/i
  ];

  return dummyPatterns.some(pat => pat.test(p));
}

/**
 * Mendeteksi apakah paket bank soal merupakan paket dummy/standar otomatis
 */
export function isDummyBankSoalPackage(pkg: any): boolean {
  if (!pkg) return true;
  // Jika secara eksplisit ditandai isDummy
  if (pkg.isDummy === true) return true;
  const id = String(pkg.id || pkg.BankSoalID || '').toUpperCase();
  if (id.startsWith('DUMMY-')) return true;

  // Jika paket memiliki butir soal yang sah, jangan pernah anggap dummy
  const soalList = Array.isArray(pkg.soalList) ? pkg.soalList : [];
  if (soalList.length > 0) {
    const hasValidRealQuestion = soalList.some(q => !isDummyQuestion(q));
    if (hasValidRealQuestion) return false;
  }

  // Jika paket dibuat pengguna / dari silabus (memiliki Mapel dan Kelas yang jelas)
  const mapel = pkg.mapel || pkg.Mapel;
  const kelas = pkg.kelas || pkg.Kelas;
  if (mapel && kelas && mapel !== 'Mata Pelajaran Dummy') {
    return false;
  }

  return false;
}

/**
 * Membersihkan paket bank soal dari seluruh butir soal dummy.
 * Jika paket hanya berisi soal dummy atau merupakan paket standar dummy, paket dibuang.
 * Jika paket memiliki soal riil non-dummy, butir soal dummy di dalamnya dibersihkan.
 */
export function purgeDummySoalAndPackages(packages: any[]): { cleanedPackages: any[]; removedCount: number } {
  if (!Array.isArray(packages)) return { cleanedPackages: [], removedCount: 0 };
  let removedCount = 0;
  const cleanedPackages: any[] = [];

  packages.forEach(pkg => {
    if (isDummyBankSoalPackage(pkg)) {
      removedCount += Array.isArray(pkg.soalList) ? pkg.soalList.length : 1;
      return;
    }

    const rawSoal = Array.isArray(pkg.soalList) ? pkg.soalList : [];
    const filteredSoal = rawSoal.filter(s => {
      const isDum = isDummyQuestion(s);
      if (isDum) removedCount++;
      return !isDum;
    });

    cleanedPackages.push({
      ...pkg,
      jumlahSoal: filteredSoal.length,
      JumlahSoal: filteredSoal.length,
      soalList: filteredSoal,
      SoalJSON: JSON.stringify(filteredSoal)
    });
  });

  return { cleanedPackages, removedCount };
}

/**
 * Ekspor file Excel (.xlsx) Template Soal CBT dengan contoh isian rapi
 */
export function exportExcelTemplateSoal(mapel = 'Pendidikan Pancasila', kelas = '1A') {
  const sampleRows = [
    {
      'No': 1,
      'Pertanyaan': 'Apa lambang sila pertama dalam Pancasila?',
      'Pilihan A': 'Bintang Emas',
      'Pilihan B': 'Rantai Baja',
      'Pilihan C': 'Pohon Beringin',
      'Pilihan D': 'Kepala Banteng',
      'Pilihan E': 'Padi dan Kapas',
      'Kunci Jawaban': 'A',
      'Pembahasan': 'Sila pertama berbunyi Ketuhanan Yang Maha Esa dan dilambangkan dengan Bintang Emas.',
      'Bobot': 5,
      'Link Gambar (Opsional)': ''
    },
    {
      'No': 2,
      'Pertanyaan': 'Perhatikan gambar lambang sila Pancasila berikut. Gambar tersebut melambangkan sila ke...',
      'Pilihan A': 'Sila Pertama',
      'Pilihan B': 'Sila Kedua',
      'Pilihan C': 'Sila Ketiga',
      'Pilihan D': 'Sila Keempat',
      'Pilihan E': 'Sila Kelima',
      'Kunci Jawaban': 'C',
      'Pembahasan': 'Pohon Beringin melambangkan Persatuan Indonesia (sila ke-3).',
      'Bobot': 5,
      'Link Gambar (Opsional)': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600'
    },
    {
      'No': 3,
      'Pertanyaan': 'Sikap yang mencerminkan penerapan sila ketiga Pancasila di lingkungan sekolah adalah...',
      'Pilihan A': 'Beribadah sesuai keyakinan masing-masing',
      'Pilihan B': 'Melakukan musyawarah pemilihan ketua kelas',
      'Pilihan C': 'Bergotong royong membersihkan ruang kelas bersama teman',
      'Pilihan D': 'Menghormati hak teman saat belajar',
      'Pilihan E': 'Berlaku adil kepada semua teman',
      'Kunci Jawaban': 'C',
      'Pembahasan': 'Gotong royong dan menjaga kerukunan mencerminkan persatuan Indonesia (sila ke-3).',
      'Bobot': 5,
      'Link Gambar (Opsional)': ''
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TEMPLATE_SOAL_CBT');
  const safeMapel = mapel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Template_Soal_CBT_${safeMapel}_Kelas_${kelas}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Helper untuk memetakan array of objects (dari XLSX atau TSV/CSV) ke SoalPilihanGanda[]
 */
export function parseRowObjectsToSoal(rows: Record<string, any>[], defaultBobot = 5): SoalPilihanGanda[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const result: SoalPilihanGanda[] = [];

  rows.forEach((row, idx) => {
    let pertanyaan = '';
    let opsiA = '';
    let opsiB = '';
    let opsiC = '';
    let opsiD = '';
    let opsiE = '';
    let kunciRaw = '';
    let pembahasan = '';
    let gambar = '';
    let bobot = defaultBobot;

    for (const [rawKey, val] of Object.entries(row)) {
      const k = rawKey.trim().toLowerCase();
      const stringVal = String(val ?? '').trim();

      if (k === 'pertanyaan' || k === 'soal' || k === 'butir soal' || k === 'teks soal' || k.includes('pertanyaan') || k.includes('soal')) {
        pertanyaan = stringVal;
      } else if (k === 'pilihan a' || k === 'opsi a' || k === 'jawaban a' || k === 'a' || k.endsWith(' a')) {
        opsiA = stringVal;
      } else if (k === 'pilihan b' || k === 'opsi b' || k === 'jawaban b' || k === 'b' || k.endsWith(' b')) {
        opsiB = stringVal;
      } else if (k === 'pilihan c' || k === 'opsi c' || k === 'jawaban c' || k === 'c' || k.endsWith(' c')) {
        opsiC = stringVal;
      } else if (k === 'pilihan d' || k === 'opsi d' || k === 'jawaban d' || k === 'd' || k.endsWith(' d')) {
        opsiD = stringVal;
      } else if (k === 'pilihan e' || k === 'opsi e' || k === 'jawaban e' || k === 'e' || k.endsWith(' e')) {
        opsiE = stringVal;
      } else if (k === 'kunci' || k === 'kunci jawaban' || k === 'jawaban' || k === 'jawaban benar' || k.includes('kunci')) {
        kunciRaw = stringVal;
      } else if (k === 'pembahasan' || k === 'penjelasan' || k === 'rasional' || k.includes('pembahasan')) {
        pembahasan = stringVal;
      } else if (k === 'gambar' || k === 'link gambar' || k === 'linkgambar' || k === 'image' || k === 'foto' || k === 'diagram' || k === 'url gambar' || k === 'imageurl' || k.includes('gambar') || k.includes('image')) {
        gambar = stringVal;
      } else if (k === 'bobot' || k === 'skor' || k === 'nilai' || k === 'poin') {
        const parsed = Number(stringVal);
        if (!isNaN(parsed) && parsed > 0) bobot = parsed;
      }
    }

    // Jika pertanyaan belum ketemu dari named key, cek value kolom terpanjang
    if (!pertanyaan) {
      const values = Object.values(row).map(v => String(v).trim()).filter(Boolean);
      const longest = values.reduce((a, b) => a.length > b.length ? a : b, '');
      if (longest && longest.length > 15) {
        pertanyaan = longest;
      }
    }

    // Normalisasi kunci jawaban
    let kunci: 'a' | 'b' | 'c' | 'd' | 'e' = 'a';
    const cleanedKunci = kunciRaw.toUpperCase().replace(/[^A-E1-5]/g, '');
    if (cleanedKunci === 'A' || cleanedKunci === '1') kunci = 'a';
    else if (cleanedKunci === 'B' || cleanedKunci === '2') kunci = 'b';
    else if (cleanedKunci === 'C' || cleanedKunci === '3') kunci = 'c';
    else if (cleanedKunci === 'D' || cleanedKunci === '4') kunci = 'd';
    else if (cleanedKunci === 'E' || cleanedKunci === '5') kunci = 'e';

    if (pertanyaan && (opsiA || opsiB)) {
      result.push({
        id: idx + 1,
        nomorSoal: idx + 1,
        pertanyaan,
        tipe: 'Pilihan Ganda',
        opsi: {
          a: opsiA || 'Pilihan A',
          b: opsiB || 'Pilihan B',
          c: opsiC || 'Pilihan C',
          d: opsiD || 'Pilihan D',
          ...(opsiE ? { e: opsiE } : {})
        },
        kunci,
        bobot,
        pembahasan,
        gambar: gambar || undefined,
        LinkGambar: gambar || undefined
      });
    }
  });

  return result;
}

/**
 * Parsing teks tab-delimited (hasil Copy-Paste tabel langsung dari sel Excel ke textarea)
 */
export function parseExcelPasteTable(tsvText: string, defaultBobot = 5): SoalPilihanGanda[] {
  if (!tsvText || !tsvText.trim()) return [];
  const lines = tsvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const firstLineCols = lines[0].split('\t').map(c => c.trim());
  const isHeader = firstLineCols.some(c => /soal|pertanyaan|opsi|pilihan|kunci|jawaban/i.test(c));

  const headers = isHeader ? firstLineCols : [];
  const dataLines = isHeader ? lines.slice(1) : lines;

  const rows: Record<string, any>[] = [];
  dataLines.forEach((line) => {
    const cols = line.split('\t').map(c => c.trim());
    if (cols.length < 2) return;

    const rowObj: Record<string, any> = {};
    if (headers.length > 0) {
      headers.forEach((h, i) => {
        rowObj[h] = cols[i] || '';
      });
    } else {
      if (cols.length >= 6) {
        rowObj['no'] = cols[0];
        rowObj['pertanyaan'] = cols[1];
        rowObj['pilihan a'] = cols[2];
        rowObj['pilihan b'] = cols[3];
        rowObj['pilihan c'] = cols[4];
        rowObj['pilihan d'] = cols[5];
        if (cols.length >= 7) rowObj['kunci'] = cols[6];
        if (cols.length >= 8) rowObj['pembahasan'] = cols[7];
      } else if (cols.length >= 5) {
        rowObj['pertanyaan'] = cols[0];
        rowObj['pilihan a'] = cols[1];
        rowObj['pilihan b'] = cols[2];
        rowObj['pilihan c'] = cols[3];
        rowObj['pilihan d'] = cols[4];
        if (cols.length >= 6) rowObj['kunci'] = cols[5];
      }
    }
    rows.push(rowObj);
  });

  return parseRowObjectsToSoal(rows, defaultBobot);
}

/**
 * Parsing data file Excel (.xlsx / .xls / .csv) menjadi kumpulan SoalPilihanGanda[]
 */
export function parseExcelQuestions(data: ArrayBuffer | Uint8Array, defaultBobot = 5): SoalPilihanGanda[] {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '', raw: false });
    
    return parseRowObjectsToSoal(rows, defaultBobot);
  } catch (err) {
    console.error('Error parsing Excel questions:', err);
    return [];
  }
}

/**
 * Mem-parsing teks butiran soal mentah (misalnya hasil ketikan dari Word / Notepad / WA / Copy-Paste Excel)
 * menjadi array SoalPilihanGanda yang siap dibundel menjadi Paket Soal.
 */
export function parseBulkQuestions(rawText: string, defaultBobot = 5): SoalPilihanGanda[] {
  if (!rawText || !rawText.trim()) return [];

  // Jika teks mengandung karakter tab ('\t'), kemungkinan besar disalin langsung dari sel Excel!
  if (rawText.includes('\t')) {
    const tableResult = parseExcelPasteTable(rawText, defaultBobot);
    if (tableResult.length > 0) {
      return tableResult;
    }
  }
  
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = text.split('\n');
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  const isQuestionStart = (line: string) => {
    const trimmed = line.trim();
    return /^(?:(?:No\.?|Nomor)?\s*\d+[\.\)]|\(\d+\))\s+/i.test(trimmed);
  };

  for (const line of lines) {
    if (isQuestionStart(line) && currentBlock.length > 0) {
      blocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  const rawBlocks = blocks.length > 0 ? blocks : text.split(/\n\s*\n/).map(b => b.split('\n'));
  const parsedSoal: SoalPilihanGanda[] = [];

  rawBlocks.forEach((blockLines, idx) => {
    const fullBlock = blockLines.join('\n').trim();
    if (!fullBlock) return;

    let pertanyaan = '';
    const opsi: { a: string; b: string; c: string; d: string; e?: string } = {
      a: '',
      b: '',
      c: '',
      d: ''
    };
    let kunci: 'a' | 'b' | 'c' | 'd' | 'e' = 'a';
    let pembahasan = '';
    let gambar = '';
    let bobot = defaultBobot;

    const bLines = fullBlock.split('\n').map(l => l.trim()).filter(Boolean);
    let collectingQuestion = true;

    for (const line of bLines) {
      const imgMatch = line.match(/^(?:\[?(?:Gambar|Image|Foto|Link\s*Gambar|Diagram)\]?\s*[:=\-]\s*|<img[^>]+src=["']([^"']+)["']|\((https?:\/\/[^\)]+\.(?:png|jpg|jpeg|gif|webp|svg)[^\)]*)\)|(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)))/i);
      if (imgMatch) {
        gambar = (imgMatch[1] || imgMatch[2] || imgMatch[3] || line.replace(/^(?:\[?(?:Gambar|Image|Foto|Link\s*Gambar|Diagram)\]?\s*[:=\-]\s*)/i, '')).trim();
        collectingQuestion = false;
        continue;
      }

      const keyMatch = line.match(/^(?:Kunci(?:\s*Jawaban)?|Jawaban|Ans(?:wer)?)\s*[:=\-]\s*([A-Ea-e])/i);
      if (keyMatch) {
        kunci = keyMatch[1].toLowerCase() as any;
        collectingQuestion = false;
        continue;
      }

      const pembMatch = line.match(/^(?:Pembahasan|Keterangan|Catatan|Rasional)\s*[:=\-]\s*(.*)$/i);
      if (pembMatch) {
        pembahasan = pembMatch[1] || '';
        collectingQuestion = false;
        continue;
      }

      const bobotMatch = line.match(/^(?:Bobot|Poin|Nilai)\s*[:=\-]\s*(\d+)/i);
      if (bobotMatch) {
        bobot = Number(bobotMatch[1]) || defaultBobot;
        collectingQuestion = false;
        continue;
      }

      const optMatch = line.match(/^[\(\[]?([A-Ea-e])[\)\]\.\:\-]\s+(.*)$/);
      if (optMatch) {
        const letter = optMatch[1].toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'e';
        opsi[letter] = optMatch[2].trim();
        collectingQuestion = false;
        continue;
      }

      if (collectingQuestion) {
        const cleanedLine = line.replace(/^(?:(?:No\.?|Nomor)?\s*\d+[\.\)]|\(\d+\))\s*/i, '');
        pertanyaan += (pertanyaan ? ' ' : '') + cleanedLine;
      } else {
        if (pembahasan) {
          pembahasan += ' ' + line;
        }
      }
    }

    if (pertanyaan && (opsi.a || opsi.b)) {
      parsedSoal.push({
        id: idx + 1,
        pertanyaan: pertanyaan.trim(),
        tipe: 'Pilihan Ganda',
        opsi: {
          a: opsi.a || 'Pilihan A',
          b: opsi.b || 'Pilihan B',
          c: opsi.c || 'Pilihan C',
          d: opsi.d || 'Pilihan D',
          ...(opsi.e ? { e: opsi.e } : {})
        },
        kunci,
        bobot,
        pembahasan: pembahasan.trim(),
        gambar: gambar || undefined,
        LinkGambar: gambar || undefined
      });
    }
  });

  // Fitur Cerdas: Jika bobot belum diatur per soal (masih nilai default)
  // Hitung bobot otomatis berdasarkan total jumlah soal agar pas 100 poin (misal 20 soal -> 5, 30 soal -> 3.33, 25 soal -> 4)
  if (parsedSoal.length > 0 && defaultBobot === 5) {
    const hasCustomBobotInText = rawBlocks.some(b => b.some(l => /^(?:Bobot|Poin|Nilai)\s*[:=\-]/i.test(l)));
    if (!hasCustomBobotInText) {
      const smartWeight = calculateSmartWeight(parsedSoal.length, 100);
      parsedSoal.forEach(s => {
        s.bobot = smartWeight;
      });
    }
  }

  return parsedSoal;
}

/**
 * Menghasilkan kumpulan paket Bank Soal standar (hanya jika diminta secara eksplisit)
 */
export function generateStandardBankSoalPackages(): BankSoalPackage[] {
  const standardDefs = [
    { no: 1, mapel: 'Pendidikan Pancasila', kelas: '4', topik: 'Makna Sila-Sila Pancasila dalam Kehidupan Sehari-hari', tema: 'Pancasila Dasar Negara', kode: 'PAN-4-01' },
    { no: 2, mapel: 'Bahasa Indonesia', kelas: '4', topik: 'Menyimak Ide Pokok dan Gagasan Pendukung Paragraf', tema: 'Teks Narasi dan Deskripsi', kode: 'IND-4-01' },
    { no: 3, mapel: 'Matematika', kelas: '4', topik: 'Operasi Bilangan Cacah dan Pecahan Senilai', tema: 'Bilangan dan Pecahan', kode: 'MTK-4-01' },
    { no: 4, mapel: 'IPA / IPAS', kelas: '4', topik: 'Siklus Hidup Makhluk Hidup dan Ekosistem', tema: 'Tumbuhan dan Lingkungan', kode: 'IPA-4-01' },
    { no: 5, mapel: 'Bahasa Inggris', kelas: '4', topik: 'Daily Activities and Time Expression', tema: 'Communication in Daily Life', kode: 'ENG-4-01' },
    { no: 6, mapel: 'Matematika', kelas: '5', topik: 'Pengukuran Luas, Volume, dan Perbandingan', tema: 'Geometri dan Pengukuran', kode: 'MTK-5-01' },
    { no: 7, mapel: 'IPA / IPAS', kelas: '5', topik: 'Sistem Organ Tubuh Manusia dan Ekologi', tema: 'Tubuh Manusia dan Lingkungan', kode: 'IPA-5-01' },
    { no: 8, mapel: 'Bahasa Indonesia', kelas: '6', topik: 'Teks Eksplanasi Ilmiah dan Pidato Persuasif', tema: 'Literasi Kritis', kode: 'IND-6-01' },
  ];

  return standardDefs.map(d => createBankSoalPackageFromSilabus({
    no: d.no,
    mataPelajaran: d.mapel,
    kelas: d.kelas,
    topikSubTugas: d.topik,
    temaModul: d.tema,
    kodeSubTugas: d.kode
  }));
}
