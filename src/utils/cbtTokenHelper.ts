/**
 * CBT Token Generator & Helper
 * Format terpadu: [KELAS]-[KODEMAPEL]-[KODEUNIK]
 * Contoh: 7A-MTK-729, 8B-IPA-415, 9A-BIND-632
 * Terkunci otomatis untuk setiap kombinasi Kelas dan Mapel
 */

export function getMapelShortCode(mapelName: string): string {
  if (!mapelName) return 'MPL';
  const m = mapelName.trim().toLowerCase();

  // Prioritas kata kunci spesifik
  if (m.includes('sejarah')) return 'SEJ';
  if (m.includes('matematika')) return 'MTK';
  if (m.includes('indonesia')) return 'BIND';
  if (m.includes('inggris')) return 'BING';
  if (m.includes('alam') || m === 'ipa') return 'IPA';
  if (m.includes('sosial') || m === 'ips') return 'IPS';
  if (m.includes('pancasila') || m.includes('pkn') || m.includes('kewarganegaraan')) return 'PPKN';
  if (m.includes('agama') || m.includes('pai') || m.includes('islam')) return 'PAI';
  if (m.includes('jasmani') || m.includes('pjok') || m.includes('olahraga')) return 'PJOK';
  if (m.includes('seni') || m.includes('budaya') || m.includes('sbdp')) return 'SBD';
  if (m.includes('informatika') || m.includes('komputer') || m.includes('tik')) return 'INF';
  if (m.includes('pemberdayaan')) return 'PEMB';
  if (m.includes('praktek') || m.includes('praktik') || m.includes('vokasi')) return 'VOK';
  if (m.includes('prakarya')) return 'PKY';
  if (m.includes('plbj')) return 'PLBJ';
  if (m.includes('baca tulis') || m.includes('calistung')) return 'BT';
  if (m.includes('fisika')) return 'FIS';
  if (m.includes('kimia')) return 'KIM';
  if (m.includes('biologi')) return 'BIO';
  if (m.includes('ekonomi')) return 'EKO';
  if (m.includes('sosiologi')) return 'SOS';
  if (m.includes('geografi')) return 'GEO';
  if (m.includes('bimbingan') || m.includes('konseling') || m.includes('bk')) return 'BK';
  if (m.includes('arab')) return 'BARB';
  if (m.includes('sunda')) return 'BSND';
  if (m.includes('jawa')) return 'BJWA';

  // Fallback: singkatan dari kata tanpa karakter khusus
  const cleanName = mapelName.replace(/[&/\\#,+()$~%.'":*?<>{}]/g, ' ');
  const words = cleanName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 3).map(w => w.charAt(0).toUpperCase()).join('');
  }
  return cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'MPL';
}

export function getClassShortCode(className: string): string {
  if (!className) return 'ALL';
  const c = className.trim().toLowerCase();
  
  // Deteksi Paket Kesetaraan
  if (c.includes('paket a')) return 'PKTA';
  if (c.includes('paket b')) return 'PKTB';
  if (c.includes('paket c')) return 'PKTC';

  // Hilangkan kata "Kelas" atau "Kls"
  let clean = c.replace(/^(kelas|kls)\s*/i, '').trim();
  clean = clean.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
  return clean.toUpperCase() || '1A';
}

/**
 * Menghasilkan token terkunci deterministik per Kelas dan Mapel
 * Format: [KELAS]-[KODEMAPEL]-[KODEUNIK]
 * Contoh: 7A-MTK-729
 */
export function buildLockedExamToken(kelas: string, mapel: string, existingCode?: string): string {
  const kCode = getClassShortCode(kelas);
  const mCode = getMapelShortCode(mapel);
  
  if (existingCode && existingCode.includes('-')) {
    const parts = existingCode.split('-');
    if (parts.length >= 3) {
      const numPart = parts[parts.length - 1].replace(/\D/g, '').slice(0, 3) || '729';
      return `${kCode}-${mCode}-${numPart}`;
    }
  }

  // Hitung hash deterministik dari kombinasi kelas dan mapel agar token stabil
  const seedStr = `${kCode}_${mCode}_cbt_tambora`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) % 900;
  }
  const uniqueDigits = String(100 + Math.abs(hash)).padStart(3, '0');

  return `${kCode}-${mCode}-${uniqueDigits}`;
}
