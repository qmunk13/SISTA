import { LogUjian } from '../types';

export const rawCheatLogsTsv = ``;

export const parseCheatLogs = (tsv: string): LogUjian[] => {
  const lines = tsv.trim().split('\n');
  if (lines.length < 2) return [];

  const list: LogUjian[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split('\t').map(c => c.trim());
    let id = '';
    let nisn = '';
    let namaSiswa = '';
    let jenjang = '';
    let kelas = '';
    let status = '';
    let waktu = '';
    let pelanggaran = 0;
    let token = '';
    let idJadwal = '';
    
    if (cols[0] && cols[0].startsWith('LOG-')) {
      id = cols[0];
      nisn = cols[1] || '';
      namaSiswa = cols[2] || '';
      jenjang = cols[3] || '';
      kelas = cols[4] || '';
      status = cols[5] || '';
      waktu = cols[6] || '';
      pelanggaran = parseInt(cols[7], 10) || 0;
      token = cols[8] || '';
      idJadwal = cols[9] || '';
    } else {
      nisn = cols[0] || '';
      namaSiswa = cols[1] || '';
      jenjang = cols[2] || '';
      kelas = cols[3] || '';
      status = cols[4] || '';
      waktu = cols[5] || '';
      pelanggaran = parseInt(cols[6], 10) || 0;
      token = cols[8] || '';
      idJadwal = cols[9] || '';
      id = `LOG-${Date.now()}-${nisn || i}-${i}`;
    }
    
    if (token === '-') token = '';
    
    list.push({
      id,
      nisn,
      namaSiswa,
      jenjang,
      kelas,
      status,
      waktu,
      pelanggaran,
      token,
      idJadwal
    });
  }
  
  return list;
};

export const initialLogUjian: LogUjian[] = parseCheatLogs(rawCheatLogsTsv);
