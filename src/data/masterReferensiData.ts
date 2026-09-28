export interface MasterReferensiItem {
  Kategori: string;
  Kode: string;
  Nama: string;
  Urutan: number;
  Keterangan: string;
  Aktif: string;
}

// Master Referensi Standar - Murni kosong diambil dari Sheet REFERENSI
export const MASTER_REFERENSI_DATA: MasterReferensiItem[] = [];
