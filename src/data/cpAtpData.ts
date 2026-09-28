/**
 * DATASET RESMI CAPAIAN PEMBELAJARAN (CP) & ALUR TUJUAN PEMBELAJARAN (ATP)
 * Berlandaskan Permendikdasmen No. 12/2024 & Keputusan Kepala BSKAP No. 032/H/KR/2024
 * Kurikulum Merdeka Pendidikan Formal & Pendidikan Kesetaraan (Paket A, Paket B, Paket C)
 */

export interface CpAtpItem {
  CpaID: string;
  Mapel: string;
  Fase: 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D' | 'Fase E' | 'Fase F' | string;
  Elemen: string;
  CapaianPembelajaran: string;
  TujuanPembelajaran: string;
  AlurTujuan: string;
  Kelas: string;
  Semester: 'Ganjil' | 'Genap' | 'Ganjil / Genap';
  Jenjang?: string;
  AlokasiWaktuJP?: number;
  MateriPokok?: string;
}

export const OFFICIAL_CP_ATP_DATA: CpAtpItem[] = [
  // ==================== MATEMATIKA ====================
  {
    CpaID: 'CP-MAT-FAS-B-01',
    Mapel: 'Matematika',
    Fase: 'Fase B',
    Elemen: 'Bilangan',
    CapaianPembelajaran: 'Peserta didik dapat menunjukkan pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 10.000. Mereka dapat membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, serta melakukan operasi penjumlahan dan pengurangan bilangan cacah sampai 1.000.',
    TujuanPembelajaran: 'TP 1: Membaca dan menulis bilangan cacah hingga 10.000 dengan nilai tempat yang tepat; TP 2: Membandingkan dan mengurutkan bilangan cacah; TP 3: Menyelesaikan operasi penjumlahan dan pengurangan bersusun bilangan cacah hingga 1.000.',
    AlurTujuan: 'Tahap 1 (Pengenalan Nilai Tempat Ribuan) -> Tahap 2 (Komparasi & Urutan Bilangan) -> Tahap 3 (Operasi Hitung Penjumlahan/Pengurangan Kontekstual) -> Tahap 4 (Problem Solving Soal Cerita).',
    Kelas: 'Kelas 4',
    Semester: 'Ganjil',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Bilangan Cacah Besar, Nilai Tempat, Operasi Hitung Campuran'
  },
  {
    CpaID: 'CP-MAT-FAS-B-02',
    Mapel: 'Matematika',
    Fase: 'Fase B',
    Elemen: 'Geometri & Pengukuran',
    CapaianPembelajaran: 'Peserta didik dapat mendeskripsikan ciri berbagai bentuk bangun datar (segiempat, segitiga, segibanyak) dan menyusun (komposisi) serta mengurai (dekomposisi) berbagai bangun datar dengan lebih dari satu cara jika memungkinkan.',
    TujuanPembelajaran: 'TP 1: Mengidentifikasi ciri-ciri sisi dan sudut bangun datar; TP 2: Menghitung keliling dan luas bangun persegi, persegipanjang, dan segitiga; TP 3: Melakukan dekomposisi bangun gabungan.',
    AlurTujuan: 'Tahap 1 (Eksplorasi Sifat Bangun Datar) -> Tahap 2 (Pengukuran Keliling Benda Nyata) -> Tahap 3 (Konsep Luas Persegi/Segitiga) -> Tahap 4 (Penyelesaian Luas Gabungan).',
    Kelas: 'Kelas 4',
    Semester: 'Genap',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 32,
    MateriPokok: 'Bangun Datar, Keliling & Luas, Sudut'
  },
  {
    CpaID: 'CP-MAT-FAS-C-01',
    Mapel: 'Matematika',
    Fase: 'Fase C',
    Elemen: 'Bilangan Pecahan & Desimal',
    CapaianPembelajaran: 'Peserta didik dapat membandingkan dan mengurutkan berbagai pecahan termasuk pecahan campuran, melakukan operasi penjumlahan dan pengurangan pecahan, serta melakukan operasi perkalian dan pembagian pecahan dengan bilangan asli.',
    TujuanPembelajaran: 'TP 1: Mengubah bentuk pecahan biasa ke desimal dan persen; TP 2: Melakukan operasi penjumlahan dan pengurangan pecahan berpenyebut berbeda; TP 3: Menyelesaikan masalah perkalian pecahan kontekstual.',
    AlurTujuan: 'Tahap 1 (Konversi Bentuk Pecahan) -> Tahap 2 (Penyamaan Penyebut KPK) -> Tahap 3 (Operasi Hitung Pecahan) -> Tahap 4 (Aplikasi Perbandingan & Skala).',
    Kelas: 'Kelas 5',
    Semester: 'Ganjil',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 40,
    MateriPokok: 'Pecahan Biasa, Desimal, Persen, Skala & Perbandingan'
  },
  {
    CpaID: 'CP-MAT-FAS-D-01',
    Mapel: 'Matematika',
    Fase: 'Fase D',
    Elemen: 'Aljabar',
    CapaianPembelajaran: 'Peserta didik dapat mengenali, memprediksi, dan menggeneralisasi pola dalam bentuk susunan benda dan bilangan. Mereka dapat menyatakan suatu situasi ke dalam bentuk aljabar dan menggunakan sifat-sifat operasi untuk menghasilkan bentuk aljabar yang ekuivalen.',
    TujuanPembelajaran: 'TP 1: Menyatakan situasi nyata ke dalam bentuk aljabar (variabel, koefisien, konstanta); TP 2: Menyederhanakan operasi suku sejenis aljabar; TP 3: Menyelesaikan persamaan linear satu variabel (PLSV).',
    AlurTujuan: 'Tahap 1 (Pemodelan Aljabar Konkret) -> Tahap 2 (Operasi Penjumlahan & Perkalian Suku Aljabar) -> Tahap 3 (Penyelesaian PLSV & PtLSV) -> Tahap 4 (Aplikasi Pemecahan Masalah Ekonomi Sederhana).',
    Kelas: 'Kelas 7',
    Semester: 'Ganjil',
    Jenjang: 'SMP / Paket B',
    AlokasiWaktuJP: 40,
    MateriPokok: 'Bentuk Aljabar, Persamaan Linear Satu Variabel (PLSV)'
  },
  {
    CpaID: 'CP-MAT-FAS-E-01',
    Mapel: 'Matematika',
    Fase: 'Fase E',
    Elemen: 'Fungsi & Pemodelan Matematika',
    CapaianPembelajaran: 'Peserta didik dapat menginterpretasi karakteristik utama dari tabel maupun grafik fungsi kuadrat, eksponensial, dan logaritma. Mereka dapat menggunakan fungsi untuk memodelkan fenomena alam dan sosial serta menyelesaikan masalah optimalisasi.',
    TujuanPembelajaran: 'TP 1: Menggambar dan menganalisis grafik fungsi kuadrat; TP 2: Menentukan nilai optimum dan titik balik fungsi kuadrat; TP 3: Menggunakan model eksponensial pada pertumbuhan dan peluruhan.',
    AlurTujuan: 'Tahap 1 (Konsep Relasi & Fungsi) -> Tahap 2 (Grafik & Karakteristik Fungsi Kuadrat) -> Tahap 3 (Pemodelan Masalah Nyata) -> Tahap 4 (Eksponensial & Logaritma).',
    Kelas: 'Kelas 10',
    Semester: 'Ganjil',
    Jenjang: 'SMA / Paket C',
    AlokasiWaktuJP: 44,
    MateriPokok: 'Fungsi Kuadrat, Eksponensial, Pemodelan Matematika'
  },

  // ==================== BAHASA INDONESIA ====================
  {
    CpaID: 'CP-IND-FAS-B-01',
    Mapel: 'Bahasa Indonesia',
    Fase: 'Fase B',
    Elemen: 'Menyimak & Membaca Memirsa',
    CapaianPembelajaran: 'Peserta didik mampu memahami pesan dan informasi tentang kehidupan sehari-hari, teks narasi, dan puisi anak dalam bentuk cetak atau elektronik. Peserta didik mampu membaca kata-kata baru dengan pola kombinasi huruf yang telah dikenali dengan fasih.',
    TujuanPembelajaran: 'TP 1: Mengidentifikasi ide pokok dan ide pendukung pada teks narasi informatif; TP 2: Menemukan makna kosakata baru menggunakan kamus/konteks kalimat; TP 3: Menjawab pertanyaan faktual dan inferensial 5W+1H.',
    AlurTujuan: 'Tahap 1 (Membaca Intensif Teks Narasi) -> Tahap 2 (Eksplorasi Kosakata Baku) -> Tahap 3 (Analisis Ide Pokok Tiap Paragraf) -> Tahap 4 (Meringkas Isi Bacaan).',
    Kelas: 'Kelas 4',
    Semester: 'Ganjil',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Teks Narasi, Ide Pokok, Kosakata Baku, 5W+1H'
  },
  {
    CpaID: 'CP-IND-FAS-B-02',
    Mapel: 'Bahasa Indonesia',
    Fase: 'Fase B',
    Elemen: 'Menulis & Mempresentasikan',
    CapaianPembelajaran: 'Peserta didik mampu menulis teks narasi, deskripsi, dan prosedur dengan rangkaian kalimat yang beragam, informasi yang rinci dan akurat dengan topik yang beragam. Peserta didik terampil menulis tegak bersambung dan menggunakan tanda baca secara tepat.',
    TujuanPembelajaran: 'TP 1: Menulis teks petunjuk/prosedur membuat sesuatu dengan urutan runtut; TP 2: Menggunakan huruf kapital, tanda titik, koma, dan kata hubung secara benar; TP 3: Mempresentasikan hasil karya tulisan di depan kelas.',
    AlurTujuan: 'Tahap 1 (Struktur Teks Prosedur) -> Tahap 2 (Penerapan Kaidah Ejaan EYD) -> Tahap 3 (Drafting & Revisi Teks Mandiri) -> Tahap 4 (Presentasi Lisan Berbicara).',
    Kelas: 'Kelas 4',
    Semester: 'Genap',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Teks Prosedur, Kaidah EYD V, Presentasi Berbicara'
  },
  {
    CpaID: 'CP-IND-FAS-D-01',
    Mapel: 'Bahasa Indonesia',
    Fase: 'Fase D',
    Elemen: 'Membaca, Memirsa & Menulis Teks LHO',
    CapaianPembelajaran: 'Peserta didik memahami informasi berupa gagasan, pikiran, pandangan, arahan atau pesan dari teks deskripsi, laporan, narasi, rekon, eksplanasi, eksposisi dari teks lisan dan tulis untuk menemukan makna yang tersurat dan tersirat.',
    TujuanPembelajaran: 'TP 1: Menganalisis struktur dan kaidah kebahasaan Teks Laporan Hasil Observasi (LHO); TP 2: Membedakan fakta dan opini pada teks eksposisi; TP 3: Menyusun teks laporan observasi objektif berbasis pengamatan lingkungan.',
    AlurTujuan: 'Tahap 1 (Observasi Lapangan & Pencatatan Data) -> Tahap 2 (Analisis Struktur LHO) -> Tahap 3 (Penulisan Laporan Objektif) -> Tahap 4 (Publikasi & Resensi Rekan).',
    Kelas: 'Kelas 7',
    Semester: 'Ganjil',
    Jenjang: 'SMP / Paket B',
    AlokasiWaktuJP: 40,
    MateriPokok: 'Teks Laporan Hasil Observasi (LHO), Teks Deskripsi Objektif'
  },
  {
    CpaID: 'CP-IND-FAS-E-01',
    Mapel: 'Bahasa Indonesia',
    Fase: 'Fase E',
    Elemen: 'Teks Anekdot & Teks Negosiasi',
    CapaianPembelajaran: 'Peserta didik mampu mengevaluasi informasi berupa gagasan, pikiran, perasaan, pandangan, arahan atau pesan yang akurat dari menyimak teks anekdot dan teks negosiasi dalam bentuk monolog, dialog, dan gelar wicara.',
    TujuanPembelajaran: 'TP 1: Menilai pesan kritik sosial dan kelucuan dalam teks anekdot; TP 2: Menganalisis struktur dialog dan taktik pengajuan-penawaran dalam teks negosiasi; TP 3: Menampilkan simulasi negosiasi kesepakatan rasional.',
    AlurTujuan: 'Tahap 1 (Apresiasi Kritik Anekdot) -> Tahap 2 (Kaidah Retorika & Ironi) -> Tahap 3 (Prinsip Win-Win Negosiasi) -> Tahap 4 (Praktik Simulasi Negosiasi Nyata).',
    Kelas: 'Kelas 10',
    Semester: 'Ganjil',
    Jenjang: 'SMA / Paket C',
    AlokasiWaktuJP: 44,
    MateriPokok: 'Teks Anekdot, Teks Negosiasi, Debat Logis'
  },

  // ==================== ILMU PENGETAHUAN ALAM DAN SOSIAL (IPAS / IPA / IPS) ====================
  {
    CpaID: 'CP-IPA-FAS-B-01',
    Mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    Fase: 'Fase B',
    Elemen: 'Pemahaman IPAS (Sains & Lingkungan)',
    CapaianPembelajaran: 'Peserta didik menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada manusia (pancaindra). Peserta didik dapat membuat simulasi menggunakan bagan/alat bantu sederhana tentang siklus hidup makhluk hidup dan upaya pelestariannya.',
    TujuanPembelajaran: 'TP 1: Mengidentifikasi bagian tumbuhan dan fungsinya (akar, batang, daun, bunga); TP 2: Menjelaskan metamorfosis sempurna dan tidak sempurna pada hewan; TP 3: Merancang tindakan pelestarian lingkungan sekitar.',
    AlurTujuan: 'Tahap 1 (Pengamatan Morfologi Tumbuhan) -> Tahap 2 (Eksperimen Fotosintesis Sederhana) -> Tahap 3 (Bagan Siklus Hidup Kupu-kupu/Katak) -> Tahap 4 (Kampanye Konservasi Satwa/Tumbuhan).',
    Kelas: 'Kelas 4',
    Semester: 'Ganjil',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Bagian Tumbuhan, Fotosintesis, Metamorfosis Hewan, Ekosistem'
  },
  {
    CpaID: 'CP-IPA-FAS-B-02',
    Mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    Fase: 'Fase B',
    Elemen: 'Pemahaman IPAS (Energi & Gaya)',
    CapaianPembelajaran: 'Peserta didik mengidentifikasi ragam gaya yang terlibat dalam aktivitas sehari-hari dan memanfaatkan energi dalam bentuk gerak, panas, listrik, bunyi, dan cahaya dalam kehidupan sehari-hari.',
    TujuanPembelajaran: 'TP 1: Membuktikan pengaruh gaya gesek, gravitasi, dan magnet terhadap gerak benda; TP 2: Menjelaskan proses perubahan bentuk energi (listrik menjadi gerak/panas); TP 3: Membuat prototype alat sederhana pemanfaatan energi terbarukan.',
    AlurTujuan: 'Tahap 1 (Eksperimen Gaya & Gerak) -> Tahap 2 (Investigasi Transformasi Energi Rumah Tangga) -> Tahap 3 (Hemat Energi & Energi Alternatif) -> Tahap 4 (Karya Mini Proyek IPAS).',
    Kelas: 'Kelas 4',
    Semester: 'Genap',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Gaya Magnet & Gravitasi, Transformasi Energi, Energi Alternatif'
  },
  {
    CpaID: 'CP-IPA-FAS-D-01',
    Mapel: 'Ilmu Pengetahuan Alam (IPA)',
    Fase: 'Fase D',
    Elemen: 'Hakikat Sains, Pengukuran & Sel Makhluk Hidup',
    CapaianPembelajaran: 'Peserta didik dapat merancang dan melakukan penyelidikan ilmiah secara mandiri untuk membuktikan hipotesis, memahami sistem organisasi kehidupan mulai dari tingkat sel sampai organisme, serta dinamika interaksi dalam ekosistem.',
    TujuanPembelajaran: 'TP 1: Menerapkan metode ilmiah dan keselamatan kerja laboratorium IPA; TP 2: Menggunakan mikroskop untuk mengamati sel hewan dan sel tumbuhan; TP 3: Menganalisis jaring-jaring makanan dan aliran energi ekosistem.',
    AlurTujuan: 'Tahap 1 (Metode Ilmiah & Alat Ukur Presisi) -> Tahap 2 (Mikroskopis Struktur Sel & Organel) -> Tahap 3 (Interaksi Simbiosis & Rantai Makanan) -> Tahap 4 (Dampak Pencemaran Lingkungan).',
    Kelas: 'Kelas 7',
    Semester: 'Ganjil',
    Jenjang: 'SMP / Paket B',
    AlokasiWaktuJP: 40,
    MateriPokok: 'Metode Ilmiah, Sel & Mikroskop, Interaksi Makhluk Hidup'
  },
  {
    CpaID: 'CP-IPS-FAS-D-01',
    Mapel: 'Ilmu Pengetahuan Sosial (IPS)',
    Fase: 'Fase D',
    Elemen: 'Ruang, Konektivitas Antarruang & Kegiatan Ekonomi',
    CapaianPembelajaran: 'Peserta didik memahami keberagaman kondisi geografis Indonesia, konektivitas antarruang, pengaruh faktor geografis terhadap aktivitas ekonomi masyarakat, serta dinamika interaksi sosial dalam kebudayaan nusantara.',
    TujuanPembelajaran: 'TP 1: Membaca peta tematik letak geografis dan astronomis Indonesia; TP 2: Menjelaskan kegiatan produksi, distribusi, dan konsumsi serta motif ekonomi; TP 3: Menguraikan bentuk-bentuk interaksi sosial asosiatif dan disosiatif.',
    AlurTujuan: 'Tahap 1 (Geografi Indonesia & Potensi Maritim) -> Tahap 2 (Interaksi Manusia & Lembaga Sosial) -> Tahap 3 (Aktivitas Pasar & Harga Keseimbangan) -> Tahap 4 (Pelestarian Budaya Lokal).',
    Kelas: 'Kelas 7',
    Semester: 'Ganjil',
    Jenjang: 'SMP / Paket B',
    AlokasiWaktuJP: 40,
    MateriPokok: 'Peta Geografis Nusantara, Kegiatan Ekonomi, Interaksi Sosial'
  },
  {
    CpaID: 'CP-BIO-FAS-F-01',
    Mapel: 'Biologi',
    Fase: 'Fase F',
    Elemen: 'Metabolisme, Genetika & Bioteknologi',
    CapaianPembelajaran: 'Peserta didik dapat menganalisis proses metabolisme sel (enzim, katabolisme, anabolisme), pewarisan sifat hukum Mendel, struktur DNA-RNA dan sintesis protein, serta implikasi bioteknologi modern bagi ketahanan pangan dan medis.',
    TujuanPembelajaran: 'TP 1: Menjelaskan mekanisme kerja enzim dan faktor yang mempengaruhinya; TP 2: Menghitung rasio fenotipe persilangan monohibrid dan dihibrid; TP 3: Mengevaluasi produk bioteknologi rekayasa genetika.',
    AlurTujuan: 'Tahap 1 (Respirasi Seluler & Fotosintesis) -> Tahap 2 (Genetika Mendel & Pautan Gen) -> Tahap 3 (Sintesis Protein DNA-RNA) -> Tahap 4 (Aplikasi Bioteknologi & Bioetika).',
    Kelas: 'Kelas 12',
    Semester: 'Ganjil',
    Jenjang: 'SMA / Paket C',
    AlokasiWaktuJP: 48,
    MateriPokok: 'Enzim, Katabolisme, Hereditas Mendel, Rekayasa Genetika'
  },

  // ==================== PENDIDIKAN PANCASILA / PKN ====================
  {
    CpaID: 'CP-PAN-FAS-B-01',
    Mapel: 'Pendidikan Pancasila',
    Fase: 'Fase B',
    Elemen: 'Pancasila & Bhinneka Tunggal Ika',
    CapaianPembelajaran: 'Peserta didik mampu memahami dan menerapkan nilai-nilai Pancasila dalam kehidupan sehari-hari di rumah, sekolah, dan masyarakat; menghargai keberagaman suku, agama, ras, dan antargolongan dengan semangat persatuan.',
    TujuanPembelajaran: 'TP 1: Menghubungkan simbol sila-sila Pancasila dengan maknanya; TP 2: Memberikan contoh sikap gotong royong dan musyawarah di kelas; TP 3: Menunjukkan sikap toleransi terhadap perbedaan budaya teman sebaya.',
    AlurTujuan: 'Tahap 1 (Arti Simbol Garuda Pancasila) -> Tahap 2 (Penerapan Sila 1 s.d 5 di Rumah & Sekolah) -> Tahap 3 (Keragaman Budaya Nusantara) -> Tahap 4 (Aksi Nyata Gotong Royong Lingkungan).',
    Kelas: 'Kelas 4',
    Semester: 'Ganjil',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 32,
    MateriPokok: 'Nilai Pancasila, Simbol Garuda, Gotong Royong, Keberagaman Budaya'
  },
  {
    CpaID: 'CP-PAN-FAS-B-02',
    Mapel: 'Pendidikan Pancasila',
    Fase: 'Fase B',
    Elemen: 'Undang-Undang Dasar 1945 & NKRI',
    CapaianPembelajaran: 'Peserta didik mampu mengidentifikasi dan mematuhi aturan di keluarga, sekolah, dan lingkungan sekitar tempat tinggal; mengenal hak dan kewajiban sebagai anggota keluarga dan warga sekolah; serta mengenal wilayah NKRI sebagai satu kesatuan.',
    TujuanPembelajaran: 'TP 1: Membedakan hak dan kewajiban anak di rumah dan di sekolah; TP 2: Menaati norma dan tata tertib kelas yang disepakati bersama; TP 3: Mengenal batas-batas wilayah desa/kelurahan dan kecamatan.',
    AlurTujuan: 'Tahap 1 (Hak dan Kewajiban Anak) -> Tahap 2 (Norma & Musyawarah Tata Tertib) -> Tahap 3 (Mengenal Wilayah Tempat Tinggal) -> Tahap 4 (Kecintaan terhadap Tanah Air NKRI).',
    Kelas: 'Kelas 4',
    Semester: 'Genap',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 32,
    MateriPokok: 'Hak & Kewajiban, Norma Aturan Sekolah, Wilayah NKRI'
  },
  {
    CpaID: 'CP-PAN-FAS-D-01',
    Mapel: 'Pendidikan Pancasila',
    Fase: 'Fase D',
    Elemen: 'Konstitusi & Norma Hukum UUD 1945',
    CapaianPembelajaran: 'Peserta didik memahami sejarah perumusan dan penetapan Pancasila sebagai dasar negara oleh BPUPKI dan PPKI, memahami norma hukum yang berlaku di Indonesia, serta menerapkan komitmen kebangsaan dalam kehidupan bernegara.',
    TujuanPembelajaran: 'TP 1: Menelaah sidang BPUPKI dan Piagam Jakarta secara kronologis; TP 2: Menjelaskan hierarki peraturan perundang-undangan di Indonesia; TP 3: Menunjukkan perilaku patuh hukum dan anti perundungan (bullying).',
    AlurTujuan: 'Tahap 1 (Sejarah Lahirnya Pancasila) -> Tahap 2 (Kandungan Pembukaan UUD 1945) -> Tahap 3 (Norma & Keadilan Hukum) -> Tahap 4 (Integritas Moral Pelajar Pancasila).',
    Kelas: 'Kelas 7',
    Semester: 'Ganjil',
    Jenjang: 'SMP / Paket B',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Sidang BPUPKI/PPKI, Tata Urutan Peraturan Perundang-undangan'
  },
  {
    CpaID: 'CP-PAN-FAS-E-01',
    Mapel: 'Pendidikan Pancasila',
    Fase: 'Fase E',
    Elemen: 'Pancasila dalam Konteks Global & Demokrasi',
    CapaianPembelajaran: 'Peserta didik mampu menganalisis kedudukan Pancasila sebagai ideologi terbuka di era digital dan globalisasi, memecahkan masalah pelanggaran hak dan pengingkaran kewajiban warga negara, serta berpartisipasi aktif dalam demokrasi deliberatif.',
    TujuanPembelajaran: 'TP 1: Mengkritisi tantangan ideologi transnasional terhadap Pancasila; TP 2: Merumuskan solusi atas kasus pelanggaran HAM di Indonesia; TP 3: Menjalankan praktik musyawarah mufakat pada pemilihan ketua OSIS/komunitas.',
    AlurTujuan: 'Tahap 1 (Ideologi Terbuka Pancasila) -> Tahap 2 (Analisis Kasus HAM & Kewajiban) -> Tahap 3 (Demokrasi & Etika Digital) -> Tahap 4 (Advokasi Nilai Kebangsaan).',
    Kelas: 'Kelas 10',
    Semester: 'Ganjil',
    Jenjang: 'SMA / Paket C',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Pancasila Ideologi Terbuka, Penegakan HAM, Demokrasi Pancasila'
  },

  // ==================== BAHASA INGGRIS ====================
  {
    CpaID: 'CP-ING-FAS-D-01',
    Mapel: 'Bahasa Inggris',
    Fase: 'Fase D',
    Elemen: 'Listening & Speaking (Interpersonal Communication)',
    CapaianPembelajaran: 'Students use English to interact and communicate in a wider range of contexts such as describing people, asking and giving opinions, and talking about daily routines with appropriate pronunciation and intonation.',
    TujuanPembelajaran: 'TP 1: Introduce oneself and others using correct greeting and parting expressions; TP 2: Describe physical appearances and personality traits of classmates; TP 3: Express simple agreement and disagreement politely.',
    AlurTujuan: 'Step 1 (Greetings & Personal Identification) -> Step 2 (Adjectives for Describing People/Animals) -> Step 3 (Asking & Giving Opinions) -> Step 4 (Short Conversational Roleplay).',
    Kelas: 'Kelas 7',
    Semester: 'Ganjil',
    Jenjang: 'SMP / Paket B',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Self Introduction, Descriptive Text, Daily Activities'
  },
  {
    CpaID: 'CP-ING-FAS-E-01',
    Mapel: 'Bahasa Inggris',
    Fase: 'Fase E',
    Elemen: 'Reading & Viewing (Expository & Narrative Texts)',
    CapaianPembelajaran: 'Students independently read and respond to familiar and unfamiliar texts containing predictable and unpredictable structures, analyzing author purposes, main ideas, and supporting details.',
    TujuanPembelajaran: 'TP 1: Identify generic structure and moral value of narrative legends; TP 2: Differentiate factual cause-and-effect statements in expository texts; TP 3: Compose an argumentative essay outlining solutions to environmental issues.',
    AlurTujuan: 'Step 1 (Narrative Text Analysis) -> Step 2 (Expository Structure & Connectives) -> Step 3 (Critical Reading & Vocabulary) -> Step 4 (Drafting Persuasive Essay).',
    Kelas: 'Kelas 10',
    Semester: 'Ganjil',
    Jenjang: 'SMA / Paket C',
    AlokasiWaktuJP: 40,
    MateriPokok: 'Narrative Legends, Expository Text, Cause & Effect Connectives'
  },

  // ==================== INFORMATIKA & TEKNOLOGI ====================
  {
    CpaID: 'CP-INF-FAS-D-01',
    Mapel: 'Informatika',
    Fase: 'Fase D',
    Elemen: 'Berpikir Komputasional (Computational Thinking)',
    CapaianPembelajaran: 'Peserta didik mampu menerapkan berpikir komputasional untuk menghasilkan solusi dari persoalan optimasi, pengurutan (sorting), pencarian (searching), dan representasi data diskrit dalam kehidupan sehari-hari.',
    TujuanPembelajaran: 'TP 1: Menerapkan algoritma sorting (bubble/selection sort) pada persoalan antrean; TP 2: Merepresentasikan struktur data pohon (tree) dan graf; TP 3: Membuat logika pemrograman visual menggunakan blok (Scratch/Blockly).',
    AlurTujuan: 'Tahap 1 (Konsep Dekomposisi & Pola) -> Tahap 2 (Algoritma Searching & Sorting) -> Tahap 3 (Logika Kondisional & Looping Visual) -> Tahap 4 (Proyek Animasi/Game Edukasi).',
    Kelas: 'Kelas 7',
    Semester: 'Ganjil',
    Jenjang: 'SMP / Paket B',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Dekomposisi, Algoritma Sorting, Pemrograman Visual Blok'
  },
  {
    CpaID: 'CP-INF-FAS-E-01',
    Mapel: 'Informatika',
    Fase: 'Fase E',
    Elemen: 'Algoritma & Analisis Data',
    CapaianPembelajaran: 'Peserta didik mampu memahami strategi algoritmik standar dan menulis program terstruktur dalam bahasa pemrograman tekstual (Python), mengolah, memvisualisasikan, dan menginterpretasi dataset nyata untuk pengambilan keputusan.',
    TujuanPembelajaran: 'TP 1: Menulis sintaks dasar variabel, tipe data, dan perulangan Python; TP 2: Mengolah data tabular menggunakan fungsi statistik dan spreadsheet; TP 3: Membuat visualisasi grafik batang/garis dari dataset survei sekolah.',
    AlurTujuan: 'Tahap 1 (Sintaks Dasar Pemrograman Python) -> Tahap 2 (Struktur Data List & Dictionary) -> Tahap 3 (Pembersihan Data Tabular) -> Tahap 4 (Visualisasi Dashboard Data).',
    Kelas: 'Kelas 10',
    Semester: 'Ganjil',
    Jenjang: 'SMA / Paket C',
    AlokasiWaktuJP: 44,
    MateriPokok: 'Python Programming, Data Cleaning, Data Visualization'
  },

  // ==================== PENDIDIKAN AGAMA & BUDI PEKERTI ====================
  {
    CpaID: 'CP-PAI-FAS-B-01',
    Mapel: 'Pendidikan Agama Islam dan Budi Pekerti',
    Fase: 'Fase B',
    Elemen: 'Al-Qur\'an Hadis & Akhlak Mulia',
    CapaianPembelajaran: 'Peserta didik mampu membaca surah-surah pendek Al-Qur\'an dengan tartil, memahami pesan pokok Surah Al-Hujurat ayat 13 tentang keragaman, serta mempraktikkan perilaku santun, jujur, dan berbakti kepada orang tua.',
    TujuanPembelajaran: 'TP 1: Membaca Q.S. Al-Hujurat/49: 13 sesuai kaidah tajwid; TP 2: Menjelaskan hikmah keragaman manusia sebagai sunnatullah; TP 3: Membiasakan adab hormat kepada guru dan menyayangi sesama.',
    AlurTujuan: 'Tahap 1 (Tilawah & Makharijul Huruf) -> Tahap 2 (Kandungan Makna Ayat Keragaman) -> Tahap 3 (Penghayatan Sifat Terpuji) -> Tahap 4 (Praktik Adab Keseharian).',
    Kelas: 'Kelas 4',
    Semester: 'Ganjil',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 32,
    MateriPokok: 'Q.S. Al-Hujurat: 13, Tajwid, Akhlak Santun & Toleran'
  },

  // ==================== SENI BUDAYA & PRAKARYA ====================
  {
    CpaID: 'CP-SEN-FAS-B-01',
    Mapel: 'Seni Rupa',
    Fase: 'Fase B',
    Elemen: 'Mengalami & Menciptakan (Karya 2D & 3D)',
    CapaianPembelajaran: 'Peserta didik mampu mengamati, mengenali dan menuangkan unsur-unsur rupa (garis, bentuk, warna primer-sekunder, tekstur, ruang) dalam karya seni rupa dua dimensi dan tiga dimensi dengan menggunakan berbagai bahan di lingkungan sekitar.',
    TujuanPembelajaran: 'TP 1: Mengenal pencampuran warna primer menjadi warna sekunder dan tersier; TP 2: Menggambar pemandangan dengan komposisi perspektif dan tekstur; TP 3: Membuat karya kriya dari bahan daur ulang ramah lingkungan.',
    AlurTujuan: 'Tahap 1 (Eksplorasi Lingkaran Warna & Garis) -> Tahap 2 (Teknik Gradasi & Komposisi Bidang) -> Tahap 3 (Kriya Daur Ulang 3D) -> Tahap 4 (Apresiasi & Pameran Mini Kelas).',
    Kelas: 'Kelas 4',
    Semester: 'Ganjil',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 32,
    MateriPokok: 'Teori Warna, Gambar Bentuk, Kriya Daur Ulang'
  },

  // ==================== PJOK ====================
  {
    CpaID: 'CP-PJK-FAS-B-01',
    Mapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
    Fase: 'Fase B',
    Elemen: 'Keterampilan Gerak Dasar & Kebugaran Jasmani',
    CapaianPembelajaran: 'Peserta didik dapat menunjukkan kemampuan dalam mempraktikkan variasi dan kombinasi pola gerak dasar lokomotor, non-lokomotor, dan manipulatif dalam berbagai permainan bola besar/kecil sederhana dan olahraga tradisional.',
    TujuanPembelajaran: 'TP 1: Mempraktikkan kombinasi gerak berlari, melompat, dan melempar bola; TP 2: Menjaga sportivitas dan kerjasama dalam permainan kasti dan estafet; TP 3: Menjelaskan pola makan sehat bergizi seimbang 4 sehat 5 sempurna.',
    AlurTujuan: 'Tahap 1 (Pemanasan & Latihan Gerak Dasar) -> Tahap 2 (Permainan Bola Kasti & Kebugaran) -> Tahap 3 (Nutrisi Sehat & Higiene Diri) -> Tahap 4 (Tes Kebugaran Jasmani Sederhana).',
    Kelas: 'Kelas 4',
    Semester: 'Ganjil',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 36,
    MateriPokok: 'Gerak Lokomotor & Manipulatif, Permainan Kasti, Nutrisi Sehat'
  }
];

/**
 * Helper untuk mengambil list CP & ATP berdasarkan filter
 */
export function getFilteredCpAtp(options?: {
  fase?: string;
  mapel?: string;
  kelas?: string;
  semester?: string;
  search?: string;
}): CpAtpItem[] {
  let list = [...OFFICIAL_CP_ATP_DATA];

  if (!options) return list;

  if (options.fase && options.fase !== 'SEMUA') {
    list = list.filter(i => i.Fase.toLowerCase() === options.fase!.toLowerCase());
  }

  if (options.mapel && options.mapel !== 'SEMUA') {
    list = list.filter(i => i.Mapel.toLowerCase().includes(options.mapel!.toLowerCase()));
  }

  if (options.kelas && options.kelas !== 'SEMUA') {
    list = list.filter(i => i.Kelas.toLowerCase().includes(options.kelas!.toLowerCase()));
  }

  if (options.semester && options.semester !== 'SEMUA') {
    list = list.filter(i => i.Semester.toLowerCase().includes(options.semester!.toLowerCase()));
  }

  if (options.search && options.search.trim() !== '') {
    const q = options.search.toLowerCase().trim();
    list = list.filter(i => 
      i.Mapel.toLowerCase().includes(q) ||
      i.Elemen.toLowerCase().includes(q) ||
      i.CapaianPembelajaran.toLowerCase().includes(q) ||
      i.TujuanPembelajaran.toLowerCase().includes(q) ||
      i.AlurTujuan.toLowerCase().includes(q) ||
      i.CpaID.toLowerCase().includes(q) ||
      (i.MateriPokok && i.MateriPokok.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Otomatis menentukan Fase berdasarkan Kelas atau Jenjang
 */
export function inferFaseFromKelasAndJenjang(kelasRaw?: string | number, jenjangRaw?: string): string {
  const kelasStr = String(kelasRaw || '').replace(/[^0-9]/g, '');
  const jenjangStr = String(jenjangRaw || '').toUpperCase();

  if (kelasStr === '1' || kelasStr === '2') return 'Fase A';
  if (kelasStr === '3' || kelasStr === '4') return 'Fase B';
  if (kelasStr === '5' || kelasStr === '6') return 'Fase C';
  if (kelasStr === '7' || kelasStr === '8' || kelasStr === '9') return 'Fase D';
  if (kelasStr === '10') return 'Fase E';
  if (kelasStr === '11' || kelasStr === '12') return 'Fase F';

  if (jenjangStr.includes('PAKET A') || jenjangStr === 'A' || jenjangStr.includes('SD')) {
    return (kelasStr === '5' || kelasStr === '6') ? 'Fase C' : 'Fase B';
  }
  if (jenjangStr.includes('PAKET B') || jenjangStr === 'B' || jenjangStr.includes('SMP')) {
    return 'Fase D';
  }
  if (jenjangStr.includes('PAKET C') || jenjangStr === 'C' || jenjangStr.includes('SMA') || jenjangStr.includes('SMK')) {
    return (kelasStr === '11' || kelasStr === '12') ? 'Fase F' : 'Fase E';
  }

  return 'Fase B';
}

/**
 * Otomatis mendeteksi Elemen CP berdasarkan Mata Pelajaran dan Judul / Materi
 */
export function inferElemenFromMapelAndTitle(mapelRaw: string, judulRaw: string, materiRaw?: string): string {
  const mapel = String(mapelRaw || '').toLowerCase();
  const text = `${judulRaw || ''} ${materiRaw || ''}`.toLowerCase();

  if (mapel.includes('matematika') || mapel.includes('mtk') || mapel.includes('mat')) {
    if (text.includes('bilangan') || text.includes('angka') || text.includes('cacah') || text.includes('pecahan') || text.includes('desimal') || text.includes('hitung') || text.includes('persen')) {
      return 'Bilangan & Operasi Hitung';
    }
    if (text.includes('geometri') || text.includes('bangun') || text.includes('ruang') || text.includes('datar') || text.includes('sudut') || text.includes('luas') || text.includes('keliling') || text.includes('ukur')) {
      return 'Geometri & Pengukuran';
    }
    if (text.includes('aljabar') || text.includes('variabel') || text.includes('persamaan') || text.includes('fungsi') || text.includes('pola')) {
      return 'Aljabar & Pemodelan';
    }
    if (text.includes('data') || text.includes('peluang') || text.includes('diagram') || text.includes('tabel') || text.includes('statistik')) {
      return 'Analisis Data & Peluang';
    }
    return 'Bilangan & Geometri';
  }

  if (mapel.includes('indonesia') || mapel.includes('indo') || mapel.includes('bin') || mapel.includes('bahasa')) {
    if (text.includes('simak') || text.includes('dengar') || text.includes('lisan') || text.includes('dongeng') || text.includes('cerita')) {
      return 'Menyimak';
    }
    if (text.includes('baca') || text.includes('memirsa') || text.includes('paragraf') || text.includes('teks') || text.includes('lho') || text.includes('observasi') || text.includes('narasi')) {
      return 'Membaca dan Memirsa';
    }
    if (text.includes('bicara') || text.includes('presentasi') || text.includes('dialog') || text.includes('wawancara') || text.includes('negosiasi') || text.includes('debat')) {
      return 'Berbicara dan Mempresentasikan';
    }
    if (text.includes('tulis') || text.includes('prosedur') || text.includes('surat') || text.includes('karangan') || text.includes('eyd') || text.includes('ejaan') || text.includes('puisi')) {
      return 'Menulis';
    }
    return 'Membaca, Memirsa & Menulis';
  }

  if (mapel.includes('ipas') || mapel.includes('ipa') || mapel.includes('sains')) {
    if (text.includes('tumbuhan') || text.includes('hewan') || text.includes('sel') || text.includes('tubuh') || text.includes('makhluk') || text.includes('ekosistem') || text.includes('hidup')) {
      return 'Pemahaman IPAS (Biologi & Lingkungan)';
    }
    if (text.includes('gaya') || text.includes('energi') || text.includes('gerak') || text.includes('listrik') || text.includes('magnet') || text.includes('panas') || text.includes('cahaya') || text.includes('materi')) {
      return 'Pemahaman IPAS (Fisika & Energi)';
    }
    if (text.includes('bumi') || text.includes('tata surya') || text.includes('cuaca') || text.includes('lingkungan') || text.includes('alam')) {
      return 'Pemahaman IPAS (Bumi & Antariksa)';
    }
    return 'Pemahaman IPAS & Keterampilan Proses';
  }

  if (mapel.includes('ips') || mapel.includes('sosial')) {
    if (text.includes('peta') || text.includes('wilayah') || text.includes('geografi') || text.includes('ruang') || text.includes('maritim')) {
      return 'Keruangan dan Konektivitas Antarruang';
    }
    if (text.includes('ekonomi') || text.includes('pasar') || text.includes('uang') || text.includes('produksi') || text.includes('konsumsi') || text.includes('jual')) {
      return 'Kegiatan Ekonomi & Kesejahteraan';
    }
    if (text.includes('sosial') || text.includes('budaya') || text.includes('masyarakat') || text.includes('interaksi') || text.includes('sejarah')) {
      return 'Interaksi Sosial & Keragaman Budaya';
    }
    return 'Pemahaman IPS & Kehidupan Bermasyarakat';
  }

  if (mapel.includes('pancasila') || mapel.includes('pkn') || mapel.includes('kewarganegaraan')) {
    if (text.includes('pancasila') || text.includes('garuda') || text.includes('sila') || text.includes('gotong royong')) {
      return 'Pancasila';
    }
    if (text.includes('uud') || text.includes('hukum') || text.includes('aturan') || text.includes('norma') || text.includes('hak') || text.includes('kewajiban')) {
      return 'Undang-Undang Dasar Negara Republik Indonesia 1945';
    }
    if (text.includes('bhinneka') || text.includes('ragam') || text.includes('toleransi') || text.includes('adat') || text.includes('budaya')) {
      return 'Bhinneka Tunggal Ika';
    }
    if (text.includes('nkri') || text.includes('persatuan') || text.includes('tanah air') || text.includes('wilayah') || text.includes('bangsa')) {
      return 'Negara Kesatuan Republik Indonesia (NKRI)';
    }
    return 'Pancasila & Norma Kebangsaan';
  }

  if (mapel.includes('inggris') || mapel.includes('english') || mapel.includes('ing')) {
    if (text.includes('speak') || text.includes('listen') || text.includes('dialog') || text.includes('conversation') || text.includes('greeting')) {
      return 'Listening & Speaking';
    }
    if (text.includes('read') || text.includes('view') || text.includes('text') || text.includes('narrative') || text.includes('descriptive')) {
      return 'Reading & Viewing';
    }
    if (text.includes('write') || text.includes('present') || text.includes('essay') || text.includes('letter')) {
      return 'Writing & Presenting';
    }
    return 'Interpersonal English Communication';
  }

  if (mapel.includes('informatika') || mapel.includes('komputer') || mapel.includes('tik') || mapel.includes('inf')) {
    if (text.includes('algoritma') || text.includes('komputasional') || text.includes('logika') || text.includes('sort') || text.includes('scratch')) {
      return 'Berpikir Komputasional (BK)';
    }
    if (text.includes('data') || text.includes('analisis') || text.includes('excel') || text.includes('tabel')) {
      return 'Analisis Data (AD)';
    }
    if (text.includes('python') || text.includes('koding') || text.includes('coding') || text.includes('program')) {
      return 'Algoritma & Pemrograman (AP)';
    }
    return 'Teknologi Informasi & Komunikasi (TIK)';
  }

  if (mapel.includes('agama') || mapel.includes('pai')) {
    return 'Al-Qur\'an Hadis, Akidah Akhlak & Budi Pekerti';
  }

  if (mapel.includes('seni') || mapel.includes('rupa') || mapel.includes('musik') || mapel.includes('prakarya')) {
    return 'Mengalami, Menciptakan & Merefleksikan Karya Seni';
  }

  if (mapel.includes('pjok') || mapel.includes('olahraga') || mapel.includes('jasmani')) {
    return 'Keterampilan Gerak & Pola Hidup Sehat';
  }

  return 'Pemahaman Konsep & Aplikasi Praktis';
}

/**
 * Menghasilkan rumusan Capaian Pembelajaran (CP) komprehensif berdasarkan modul
 */
export function synthesizeCapaianPembelajaran(
  mapel: string,
  elemen: string,
  judulModul: string,
  materiPokok: string,
  fase: string,
  kelas: string
): string {
  const cleanJudul = judulModul.replace(/^(Modul|Unit|Bab)\s*\d*[:.-]?\s*/i, '').trim();
  const cleanMateri = materiPokok ? materiPokok.replace(/[;]/g, ', ') : cleanJudul;

  return `Pada akhir ${fase} (${kelas}), peserta didik memiliki kemampuan dalam elemen ${elemen} untuk menguasai kompetensi dasar materi ${cleanJudul}. Peserta didik mampu mengidentifikasi konsep esensial, menganalisis hubungan antar gagasan (${cleanMateri}), memecahkan masalah kontekstual dalam kehidupan sehari-hari secara kritis, mandiri, dan bergotong royong sesuai prinsip Profil Pelajar Pancasila.`;
}

/**
 * Menghasilkan butir Tujuan Pembelajaran (TP 1, TP 2, TP 3, TP 4) dari topik & materi modul
 */
export function synthesizeTujuanPembelajaran(
  judulModul: string,
  unitRaw?: string,
  materiPokokRaw?: string
): string {
  const cleanJudul = judulModul.replace(/^(Modul|Unit|Bab)\s*\d*[:.-]?\s*/i, '').trim();
  let parts: string[] = [];

  if (materiPokokRaw && materiPokokRaw.trim() !== '') {
    parts = materiPokokRaw.split(/[,;\n]/).map(p => p.trim()).filter(p => p.length > 2);
  }

  if (parts.length < 2 && unitRaw && unitRaw.trim() !== '') {
    const unitParts = unitRaw.split(/[,;\n]/).map(u => u.trim()).filter(u => u.length > 2);
    parts.push(...unitParts);
  }

  if (parts.length === 0) {
    parts = [
      `Konsep dasar dan definisi ${cleanJudul}`,
      `Analisis dan prosedur penerapan ${cleanJudul}`,
      `Pemecahan masalah soal kontekstual ${cleanJudul}`,
      `Evaluasi dan penyajian hasil proyek ${cleanJudul}`
    ];
  }

  const tp1 = parts[0] ? `TP 1: Mengidentifikasi dan memahami konsep dasar ${parts[0]};` : `TP 1: Mengidentifikasi konsep dasar ${cleanJudul};`;
  const tp2 = parts[1] ? `TP 2: Menganalisis dan menguraikan keterkaitan ${parts[1]};` : `TP 2: Menerapkan prosedur pemecahan masalah ${cleanJudul};`;
  const tp3 = parts[2] ? `TP 3: Menyelesaikan masalah kontekstual terkait ${parts[2]};` : `TP 3: Mengembangkan solusi kreatif berbasis ${cleanJudul};`;
  const tp4 = parts[3] ? `TP 4: Mempresentasikan dan menyimpulkan hasil kajian ${parts[3]}.` : `TP 4: Merefleksikan dan menyajikan karya/laporan terkait ${cleanJudul}.`;

  return `${tp1} ${tp2} ${tp3} ${tp4}`;
}

/**
 * Menghasilkan Alur Tujuan Pembelajaran (ATP) berjenjang
 */
export function synthesizeAlurTujuan(
  judulModul: string,
  unitRaw?: string,
  materiPokokRaw?: string
): string {
  const cleanJudul = judulModul.replace(/^(Modul|Unit|Bab)\s*\d*[:.-]?\s*/i, '').trim();
  let parts: string[] = [];

  if (materiPokokRaw && materiPokokRaw.trim() !== '') {
    parts = materiPokokRaw.split(/[,;\n]/).map(p => p.trim()).filter(p => p.length > 2);
  }

  const p1 = parts[0] || `Eksplorasi Konsep ${cleanJudul}`;
  const p2 = parts[1] || `Investigasi & Analisis Komparatif`;
  const p3 = parts[2] || `Aplikasi Pemecahan Masalah Nyata`;
  const p4 = parts[3] || `Refleksi, Proyek Kolaboratif & Penilaian`;

  return `Tahap 1 (${p1}) -> Tahap 2 (${p2}) -> Tahap 3 (${p3}) -> Tahap 4 (${p4}).`;
}

/**
 * Mengubah 1 Item KURIKULUM_MODUL menjadi 1 Item CP_ATP terstruktur
 */
export function convertKurikulumModulToCpAtp(modul: any, index: number = 0): CpAtpItem {
  const mapel = String(modul.NamaMapel || modul.mataPelajaran || modul.mapel || 'Matematika').trim();
  const kodeMapel = String(modul.kodeMapel || modul.singkatan || modul.sing || 'MP').trim().toUpperCase();
  const kelasVal = String(modul.kelas || '4').replace(/[^0-9]/g, '') || '4';
  const jenjangVal = String(modul.Jenjang || modul.paket || 'A').trim();
  const judulModul = String(modul.judulModul || modul.temaModul || modul.nama || `Modul Pembelajaran ${index + 1}`).trim();
  const unit = String(modul.Unit || modul.babUnit || '').trim();
  const materiPokok = String(
    Array.isArray(modul.materiPokok) ? modul.materiPokok.join(', ') : (modul.materiPokok || modul.topikSubTugas || judulModul)
  ).trim();
  const semesterVal = String(modul.semester || (index % 2 === 0 ? 'Ganjil' : 'Genap')).trim();
  const noModul = modul.noModul || modul.modulNo || modul.modul || (index + 1);

  const fase = inferFaseFromKelasAndJenjang(kelasVal, jenjangVal);
  const faseCode = fase.replace(/\s+/g, '').toUpperCase();
  const elemen = inferElemenFromMapelAndTitle(mapel, judulModul, materiPokok);

  // Buat ID CpaID unik yang rapi
  const safeModulId = modul.kodeModul 
    ? `CP-${modul.kodeModul.replace(/[^a-zA-Z0-9_-]/g, '')}`
    : `CP-${kodeMapel}-${faseCode}-K${kelasVal}-M${noModul}`;

  const cpDeskripsi = synthesizeCapaianPembelajaran(mapel, elemen, judulModul, materiPokok, fase, `Kelas ${kelasVal}`);
  const tpDeskripsi = synthesizeTujuanPembelajaran(judulModul, unit, materiPokok);
  const atpDeskripsi = synthesizeAlurTujuan(judulModul, unit, materiPokok);

  return {
    CpaID: safeModulId,
    Mapel: mapel,
    Fase: fase,
    Elemen: elemen,
    CapaianPembelajaran: cpDeskripsi,
    TujuanPembelajaran: tpDeskripsi,
    AlurTujuan: atpDeskripsi,
    Kelas: `Kelas ${kelasVal}`,
    Semester: semesterVal.toLowerCase().includes('genap') || semesterVal === 'SM-II' ? 'Genap' : 'Ganjil',
    Jenjang: jenjangVal.toUpperCase().includes('A') ? 'SD / Paket A' : jenjangVal.toUpperCase().includes('B') ? 'SMP / Paket B' : 'SMA / Paket C',
    AlokasiWaktuJP: 36,
    MateriPokok: materiPokok || judulModul
  };
}

/**
 * Mengonversi seluruh daftar KURIKULUM_MODUL dan MASTER_SILABUS menjadi dataset resmi CP_ATP
 */
export function generateCpAtpListFromKurikulumModul(
  modulList: any[] = [],
  silabusList: any[] = []
): CpAtpItem[] {
  const result: CpAtpItem[] = [];
  const seenMap = new Set<string>();

  // 1. Prioritaskan Modul dari KURIKULUM_MODUL
  if (Array.isArray(modulList) && modulList.length > 0) {
    modulList.forEach((m, idx) => {
      const converted = convertKurikulumModulToCpAtp(m, idx);
      const key = `${converted.Mapel.toLowerCase()}-${converted.Kelas.toLowerCase()}-${converted.Elemen.toLowerCase()}-${converted.Semester.toLowerCase()}`;
      if (!seenMap.has(key)) {
        seenMap.add(key);
        result.push(converted);
      }
    });
  }

  // 2. Jika ada silabus tambahan yang belum tercakup di modul
  if (Array.isArray(silabusList) && silabusList.length > 0) {
    silabusList.forEach((s, idx) => {
      const mapel = String(s.NamaMapel || s.mataPelajaran || s.mapel || '').trim();
      const kelas = String(s.kelas || '4').replace(/[^0-9]/g, '') || '4';
      const tema = String(s.temaModul || s.topikSubTugas || '').trim();
      if (mapel && tema) {
        const key = `${mapel.toLowerCase()}-kelas ${kelas.toLowerCase()}-${tema.toLowerCase()}`;
        if (!seenMap.has(key)) {
          seenMap.add(key);
          const converted = convertKurikulumModulToCpAtp({
            NamaMapel: mapel,
            kodeMapel: s.kodeMapel || s.singkatan || 'MP',
            kelas: kelas,
            Jenjang: s.Jenjang || s.paket || 'A',
            judulModul: s.temaModul || s.topikSubTugas,
            Unit: s.subKe || 'Unit 1',
            materiPokok: s.topikSubTugas || s.temaModul,
            semester: s.semester || 'Ganjil',
            noModul: s.noModul || idx + 1
          }, result.length);
          result.push(converted);
        }
      }
    });
  }

  // 3. Gabungkan dengan OFFICIAL_CP_ATP_DATA sebagai standar bila belum ada
  OFFICIAL_CP_ATP_DATA.forEach(off => {
    const key = `${off.Mapel.toLowerCase()}-${off.Kelas.toLowerCase()}-${off.Elemen.toLowerCase()}-${off.Semester.toLowerCase()}`;
    if (!seenMap.has(key)) {
      seenMap.add(key);
      result.push(off);
    }
  });

  return result;
}

