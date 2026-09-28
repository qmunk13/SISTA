import { KeuanganBiaya } from './keuanganSeed';
import { MasterTarifBiayaItem } from './seedMasterData';

export interface RawBiayaSheetItem {
  BiayaID: string;
  KodeBiaya: string;
  NamaBiaya: string;
  Kategori: string;
  Jenjang: string;
  Target_Kelas: string;
  KelasID: string;
  SiswaID?: string;
  NamaSiswa?: string;
  Nominal: string | number;
  Periode?: string;
  Wajib: string;
  Status: string;
  Keterangan: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// Clean Slate: 0 Data Pos Biaya bawaan. Data murni bersumber dari sinkronisasi Google Sheets / input pengguna
export const RAW_MASTER_BIAYA_ROMBEL_38: RawBiayaSheetItem[] = [];

// Normalized into KeuanganBiaya model
export const MASTER_BIAYA_ROMBEL_37: KeuanganBiaya[] = [];

// Normalized into MasterTarifBiayaItem for MasterDataPage
export const MASTER_TARIF_ROMBEL_38: MasterTarifBiayaItem[] = [];
