# 📋 PANDUAN FORMAT IMPOR SPREADSHEET (EXCEL / GOOGLE SHEETS)
### SISTEM INFORMASI AKADEMIK & ERP ROMBEL KTCT TAMBORA

Panduan ini disusun untuk memudahkan Anda melakukan migrasi data riil sekolah ke dalam sistem ERP. Dengan fitur **Smart Copy-Paste Importer**, Anda tidak perlu bersusah payah mengunggah file. Cukup blok tabel di **Microsoft Excel** atau **Google Sheets**, tekan `Ctrl+C` (Salin), lalu tempelkan (`Ctrl+V`) ke dalam kotak teks yang telah disediakan di menu **Master Data > Impor & Sinkronisasi**.

Sistem secara cerdas akan mendeteksi baris tajuk kolom Anda (case-insensitive) dan memetakan datanya secara otomatis!

---

## 1. MODUL SISWA AKTIF & CALON SISWA
Gunakan format di bawah ini untuk mengimpor data peserta didik baru maupun siswa aktif. Sistem secara otomatis akan membuatkan **akun login siswa** dengan Username berupa **No. Pendaftaran (No. PDKT)** dan Password default: `siswa123`.

### 📌 Daftar Kolom yang Didukung (Deteksi Otomatis):
| Nama Data | Nama Kolom yang Diterima (Pilih Salah Satu) | Deskripsi | Status |
| :--- | :--- | :--- | :--- |
| **No. PDKT (ID Utama)** | `No. PDKT`, `no pdkt`, `id`, `nomor pendaftaran`, `no_pdkt` | ID pendaftaran unik siswa. | **WAJIB** |
| **Nama Lengkap** | `Nama`, `nama lengkap`, `nama_lengkap`, `nama siswa` | Nama lengkap peserta didik. | **WAJIB** |
| **NISN** | `NISN`, `nisn`, `nomor induk siswa nasional` | Nomor Induk Siswa Nasional (10 digit). | Opsional |
| **Jenis Kelamin** | `JK`, `jenis kelamin`, `jk`, `kelamin`, `gender` | `L` (Laki-laki) atau `P` (Perempuan). | Opsional (Default: L) |
| **Kelas / Rombel** | `Kelas`, `kelasid`, `rombel`, `id_kelas` | Kode Kelas (Cth: `A4`, `B7`, `C10`). | Opsional |
| **Tahun Masuk** | `Tahun Masuk`, `masuk`, `tahun_masuk`, `tahunmasuk` | Tahun masuk sekolah (Cth: `2026`). | Opsional |
| **Status Akademik** | `Status`, `status akademik`, `status_terbaru` | `AKTIF`, `MUTASI`, `LULUS`, `KELUAR`. | Opsional (Default: AKTIF) |
| **No. Kartu Keluarga**| `No KK`, `kartu keluarga`, `no_kk` | Nomor KK orang tua/wali. | Opsional |
| **No. Telepon** | `No HP`, `telepon`, `no_hp`, `kontak` | Nomor HP aktif untuk pengiriman tagihan. | Opsional |
| **Tanggal Lahir** | `Tanggal Lahir`, `tgl lahir`, `lahir` | Format YYYY-MM-DD atau DD/MM/YYYY. | Opsional |
| **Alamat Tinggal** | `Alamat`, `alamat tinggal`, `alamat_rumah` | Alamat lengkap domisili siswa. | Opsional |

### 📝 Contoh Tabel untuk Disalin (Copy-Paste):
```text
No. PDKT	NISN	Nama	JK	Kelas	Tahun Masuk	Status
PDKT-2026-001	0094911973	VITA FADILLAH	P	A4	2026	AKTIF
PDKT-2026-002	0079003620	UKASAH AL MUQRI ASSADUSI	L	B7	2026	AKTIF
PDKT-2026-003	3117562473	SYIFA PUTRI AZZAHRA	P	C10	2026	AKTIF
```

---

## 2. MODUL GURU & GTK (PENDIDIK)
Gunakan format di bawah ini untuk mengimpor data guru-guru pengajar. Sistem secara otomatis akan membuatkan **akun login guru** dengan Username berupa **NIP / Kode Guru** dan Password default: `guru123`.

### 📌 Daftar Kolom yang Didukung (Deteksi Otomatis):
| Nama Data | Nama Kolom yang Diterima (Pilih Salah Satu) | Deskripsi | Status |
| :--- | :--- | :--- | :--- |
| **NIP / ID Guru** | `NIP`, `id`, `kode`, `nip guru`, `id_guru` | NIP unik guru atau ID Pegawai. | **WAJIB** |
| **Nama Lengkap** | `Nama`, `nama lengkap`, `nama guru`, `lengkap` | Nama lengkap guru beserta gelar. | **WAJIB** |
| **Mata Pelajaran** | `Mapel Utama`, `mapel`, `mata pelajaran`, `mengajar` | Mata pelajaran utama yang diampu. | Opsional |
| **Kelas Ajar** | `Kelas Ajar`, `kelas`, `rombel` | Kelas tempat mengajar (Cth: `A4, B7`). | Opsional |
| **Jenis Kelamin** | `JK`, `jenis kelamin`, `kelamin`, `gender` | `L` atau `P`. | Opsional |
| **No. Telepon** | `No HP`, `telepon`, `no_hp` | Kontak WhatsApp aktif guru. | Opsional |
| **Email Resmi** | `Email`, `email guru`, `surel` | Email untuk korespondensi resmi. | Opsional |

### 📝 Contoh Tabel untuk Disalin (Copy-Paste):
```text
NIP	Nama	Mapel Utama	Kelas Ajar	JK	No HP	Email
19870101	Prof. Budiman, M.Pd.	Fisika	A4	L	081234567812	budiman@rombel.com
19890202	Dra. Siti Aminah	Bahasa Indonesia	B7	P	085678901234	siti@rombel.com
```

---

## 3. MODUL MATA PELAJARAN (KURIKULUM)
Gunakan format di bawah ini untuk memasukkan silabus mata pelajaran dan KKM (Kriteria Ketuntasan Minimal) untuk tiap paket kesetaraan.

### 📌 Daftar Kolom yang Didukung (Deteksi Otomatis):
| Nama Data | Nama Kolom yang Diterima (Pilih Salah Satu) | Deskripsi | Status |
| :--- | :--- | :--- | :--- |
| **ID Mapel** | `ID Mapel`, `id`, `kode`, `kode mapel`, `id_mapel` | Kode unik mata pelajaran (Cth: `A4-BING`). | **WAJIB** |
| **Nama Mapel** | `Nama Mapel`, `nama`, `mapel`, `mata pelajaran` | Nama mata pelajaran (Cth: `Bahasa Inggris`). | **WAJIB** |
| **KKM** | `KKM`, `kkm`, `minimum`, `nilai ketuntasan` | Batas nilai kelulusan minimum (Cth: `75`).| Opsional (Default: 75) |
| **Target Kelas** | `Kelas`, `kelas_target`, `tingkat` | Angka kelas target (Cth: `4`, `7`, `10`). | Opsional |
| **Jenjang Paket** | `Jenjang`, `paket`, `program` | Program kesetaraan (`PAKET A`, `PAKET B`, `PAKET C`). | Opsional |

### 📝 Contoh Tabel untuk Disalin (Copy-Paste):
```text
ID Mapel	Nama Mapel	KKM	Kelas	Jenjang
A4-BING	Bahasa Inggris	75	4	PAKET A
B7-MAT	Matematika Dasar	70	7	PAKET B
C10-FIS	Fisika Terapan	75	10	PAKET C
```

---

## 4. MODUL KEUANGAN (TARIF TAGIHAN BIAYA)
Gunakan format di bawah ini untuk mengatur nominal tarif tagihan wajib atau sumbangan bulanan yang berlaku di masing-masing rombel / sasaran kelas.

### 📌 Daftar Kolom yang Didukung (Deteksi Otomatis):
| Nama Data | Nama Kolom yang Diterima (Pilih Salah Satu) | Deskripsi | Status |
| :--- | :--- | :--- | :--- |
| **ID Biaya** | `ID Biaya`, `id`, `kode`, `kode biaya`, `id_biaya` | Kode unik tarif tagihan (Cth: `SPP_C10`). | **WAJIB** |
| **Nama Tagihan** | `Nama Tagihan`, `nama`, `biaya`, `nama_biaya` | Deskripsi tagihan (Cth: `SPP Paket C Kelas 10`). | **WAJIB** |
| **Nominal (Rupiah)**| `Nominal`, `jumlah`, `nominal_biaya`, `tarif` | Angka tarif tanpa Rp atau titik desimal (Cth: `150000`). | Opsional (Default: 0) |
| **Sasaran Rombel** | `Sasaran Kelas`, `kelas`, `id_kelas`, `sasaran` | Rombel penerima tagihan (Cth: `C10` atau `Semua`). | Opsional |
| **Status Aktif** | `Status`, `aktif`, `is_active` | `AKTIF` atau `NONAKTIF`. | Opsional (Default: AKTIF) |

### 📝 Contoh Tabel untuk Disalin (Copy-Paste):
```text
ID Biaya	Nama Tagihan	Nominal	Sasaran Kelas	Status
BIA_SPP_A4	SPP Bulanan Paket A4	100000	A4	AKTIF
BIA_SPP_B7	SPP Bulanan Paket B7	120000	B7	AKTIF
BIA_SPP_C10	SPP Bulanan Paket C10	150000	C10	AKTIF
```

---

## ⚠️ CARA MENGOSONGKAN DATA SIMULASI SEBELUM IMPOR
Sebelum Anda menyalin data riil sekolah di atas, sangat disarankan untuk **membersihkan seluruh database simulasi** yang ada agar tidak tercampur.

1. Buka halaman **Master Data**.
2. Pilih tab **Import/Export Spreadsheet**.
3. Gulir ke bagian paling bawah ke **Panel Kontrol Pembersihan & Reset Database ERP**.
4. Klik tombol merah **🧹 Kosongkan Seluruh Database ERP** (Total Wipe) untuk membersihkan semua data simulasi sekaligus.
5. Sistem Anda sekarang dalam kondisi **bersih 100% (Clean Slate)** dan siap menerima paste data dari file Excel Anda!
