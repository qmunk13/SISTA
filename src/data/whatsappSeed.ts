import { WhatsAppMessage } from '../types';
import { db } from './db';

export interface WhatsAppTemplate {
  id: string;
  judul: string;
  kategori: 'Presensi' | 'Tagihan' | 'Pengumuman' | 'Akademik' | 'SPMB' | 'Darurat';
  template: string;
  tags: string[];
}

export const WA_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'TPL-ABS-01',
    judul: 'Notifikasi Siswa Hadir di Sekolah',
    kategori: 'Presensi',
    template: 'Bapak/Ibu Orang Tua dari *{namaSiswa}* (Kelas {kelas}), kami informasikan bahwa ananda telah hadir dan melakukan presensi masuk di sekolah pada *{waktu}* WIB dalam keadaan sehat. Terima kasih atas perhatiannya. - {namaSekolah}',
    tags: ['{namaSiswa}', '{kelas}', '{waktu}', '{namaSekolah}'],
  },
  {
    id: 'TPL-ABS-02',
    judul: 'Pemberitahuan Siswa Tidak Hadir (Alpa / Tanpa Keterangan)',
    kategori: 'Presensi',
    template: 'Yth. Orang Tua/Wali dari *{namaSiswa}* (Kelas {kelas}), ananda tercatat *belum hadir / tanpa keterangan (Alpa)* pada KBM hari ini tanggal {tanggal}. Mohon konfirmasi mengenai kondisi ananda ke Wali Kelas ({waliKelas}) atau membalas pesan ini. - {namaSekolah}',
    tags: ['{namaSiswa}', '{kelas}', '{tanggal}', '{waliKelas}', '{namaSekolah}'],
  },
  {
    id: 'TPL-TAG-01',
    judul: 'Pengingat Tagihan Iuran / Biaya Pendidikan',
    kategori: 'Tagihan',
    template: 'Yth. Bapak/Ibu Wali dari *{namaSiswa}* (Kelas {kelas}), kami sampaikan rincian tagihan pendidikan bulan *{bulan}* sebesar *Rp {nominal}* untuk pos *{namaBiaya}*. Pembayaran dapat dilakukan melalui loket tata usaha atau transfer rekening resmi sekolah. Terima kasih. - Bendahara {namaSekolah}',
    tags: ['{namaSiswa}', '{kelas}', '{bulan}', '{nominal}', '{namaBiaya}', '{namaSekolah}'],
  },
  {
    id: 'TPL-TAG-02',
    judul: 'Konfirmasi Penerimaan Pembayaran / Kuitansi',
    kategori: 'Tagihan',
    template: 'Alhamdulillah, pembayaran atas nama *{namaSiswa}* untuk *{namaBiaya}* sebesar *Rp {nominal}* pada tanggal {tanggal} telah kami terima dengan status *LUNAS* (No. Kuitansi: {noKuitansi}). Terima kasih. - {namaSekolah}',
    tags: ['{namaSiswa}', '{namaBiaya}', '{nominal}', '{tanggal}', '{noKuitansi}', '{namaSekolah}'],
  },
  {
    id: 'TPL-PGM-01',
    judul: 'Pengumuman Pertemuan Komite / Wali Murid',
    kategori: 'Pengumuman',
    template: 'Yth. Bapak/Ibu Orang Tua Murid {namaSekolah}, kami mengundang kehadiran Bapak/Ibu pada rapat silaturahmi yang diselenggarakan pada *{hariTanggal}* pukul *{jam}* bertempat di *{tempat}*. Kehadiran Bapak/Ibu sangat berharga bagi kemajuan siswa. - {namaSekolah}',
    tags: ['{namaSekolah}', '{hariTanggal}', '{jam}', '{tempat}'],
  },
  {
    id: 'TPL-AKD-01',
    judul: 'Jadwal Penilaian & Rapor Tengah Semester',
    kategori: 'Akademik',
    template: 'Pemberitahuan Akademik: Pelaksanaan Asesmen Sumatif Tengah Semester ananda *{namaSiswa}* akan dimulai tanggal *{tanggalMulai}*. Mohon bimbingan belajar di rumah. Kartu tes dan jadwal dapat diakses via Portal Siswa. - {namaSekolah}',
    tags: ['{namaSiswa}', '{tanggalMulai}', '{namaSekolah}'],
  },
];

export const INITIAL_WA_MESSAGES: WhatsAppMessage[] = [];

export function ensureWaSeedData() {
  const existing = db.get<WhatsAppMessage>('whatsapp_messages');
  if (!existing || existing.length === 0) {
    db.set('whatsapp_messages', INITIAL_WA_MESSAGES);
  }
}

export function formatWaPhone(phone: string): string {
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function generateWaLink(phone: string, text: string): string {
  const formattedNumber = formatWaPhone(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${formattedNumber}?text=${encodedText}`;
}
