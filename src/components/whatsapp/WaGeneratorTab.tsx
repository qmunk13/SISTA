import React, { useState, useEffect } from 'react';
import { 
  Send, Copy, Check, MessageSquare, Phone, User, 
  Sparkles, RefreshCw, Smartphone, ExternalLink, HelpCircle 
} from 'lucide-react';
import { WaTemplate, Siswa, WaMessageLog } from '../../types';
import { db } from '../../data/db';

export default function WaGeneratorTab() {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Custom Form Fields
  const [nomorTujuan, setNomorTujuan] = useState('');
  const [namaPenerima, setNamaPenerima] = useState('');
  const [pesanRaw, setPesanRaw] = useState('');
  const [pesanRendered, setPesanRendered] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Dynamic Variable Replacements
  const [customVars, setCustomVars] = useState<Record<string, string>>({
    NAMA_SEKOLAH: 'SD NEGERI KECAMATAN TAMBORA',
    BULAN: 'Februari 2026',
    NOMINAL_TAGIHAN: 'Rp 150.000',
    JATUH_TEMPO: '10 Maret 2026',
    NO_REKENING: '102-00-1234567-8 (Bank DKI)',
    ATAS_NAMA: 'Komite Sekolah SD Negeri Tambora',
    NAMA_ACARA: 'Rapat Koordinasi Evaluasi Kurikulum Merdeka',
    TANGGAL_ACARA: 'Sabtu, 28 Februari 2026',
    WAKTU_ACARA: '08.30 - 11.30',
    LOKASI_ACARA: 'Aula Utama Sekolah',
    SEMESTER: 'Genap',
    RATA_NILAI: '88.50 (Sangat Baik)',
    CATATAN_WALI: 'Menunjukkan perkembangan budi pekerti yang sangat santun dan aktif berkolaborasi.',
    LINK_PORTAL: 'https://sista-rombel.sch.id/portal/rapor-auth'
  });

  useEffect(() => {
    const tpls = db.get<WaTemplate>('wa_templates');
    const stds = db.get<Siswa>('siswa');
    setTemplates(tpls);
    setStudents(stds);

    if (tpls.length > 0) {
      setSelectedTemplateId(tpls[0].id);
      setPesanRaw(tpls[0].pesan);
    }
    if (stds.length > 0) {
      setSelectedStudentId(stds[0].id);
      setNamaPenerima(stds[0].namaWali || `Wali dari ${stds[0].nama}`);
      setNomorTujuan(stds[0].teleponOrtu || '081234567890');
    }
  }, []);

  // Update Raw Message when Template changes
  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = templates.find(t => t.id === tplId);
    if (found) {
      setPesanRaw(found.pesan);
    }
  };

  // Update Student info when Student changes
  const handleStudentChange = (stdId: string) => {
    setSelectedStudentId(stdId);
    const found = students.find(s => s.id === stdId);
    if (found) {
      setNamaPenerima(found.namaWali || `Wali dari ${found.nama}`);
      setNomorTujuan(found.teleponOrtu || '081234567890');
    }
  };

  // Compute rendered message dynamically
  useEffect(() => {
    let result = pesanRaw;
    const student = students.find(s => s.id === selectedStudentId);

    const now = new Date();
    const todayFormatted = now.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Built-in student replacements
    result = result.replace(/{NAMA_SEKOLAH}/g, customVars.NAMA_SEKOLAH || 'SD NEGERI TAMBORA');
    result = result.replace(/{NAMA_SISWA}/g, student?.nama || 'Ahmad Fauzi');
    result = result.replace(/{NIS}/g, student?.nis || student?.id || '202601001');
    result = result.replace(/{KELAS}/g, student?.kelas || '5A');
    result = result.replace(/{TANGGAL}/g, todayFormatted);
    result = result.replace(/{WAKTU}/g, timeFormatted);

    // Other variables
    Object.entries(customVars).forEach(([key, val]) => {
      const reg = new RegExp(`{${key}}`, 'g');
      result = result.replace(reg, val);
    });

    setPesanRendered(result);
  }, [pesanRaw, selectedStudentId, students, customVars]);

  // Clean phone number for WhatsApp link (must start with 62)
  const getCleanPhone = (phone: string) => {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  const handleSendWhatsApp = () => {
    if (!nomorTujuan) {
      alert('Masukkan nomor WhatsApp tujuan!');
      return;
    }

    const cleanNumber = getCleanPhone(nomorTujuan);
    const encoded = encodeURIComponent(pesanRendered);
    const waUrl = `https://wa.me/${cleanNumber}?text=${encoded}`;

    // Log to message history
    const existingLogs = db.get<WaMessageLog>('wa_message_logs');
    const newLog: WaMessageLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      penerimaNama: namaPenerima || 'Wali Murid',
      penerimaNomor: cleanNumber,
      penerimaPeran: 'Wali Murid',
      kategori: templates.find(t => t.id === selectedTemplateId)?.kategori || 'Pengumuman',
      pesan: pesanRendered.slice(0, 150) + (pesanRendered.length > 150 ? '...' : ''),
      status: 'Terkirim',
      waktu: new Date().toISOString().replace('T', ' ').slice(0, 19),
      petugas: 'Operator Sistem'
    };
    db.set('wa_message_logs', [newLog, ...existingLogs]);

    // Open WhatsApp Web/App
    window.open(waUrl, '_blank');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(pesanRendered);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Settings & Template Selector (7 Cols) */}
        <div className="lg:col-span-7 space-y-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-500" />
              <span>Generator Pesan WhatsApp Cepat</span>
            </h3>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              WA API Gateway
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Step 1: Template Selection */}
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">
                1. Pilih Template Notifikasi
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.kategori}] {t.namaTemplate}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Target Student Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  2. Pilih Siswa Penerima
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nama} (Kelas {s.kelas || '5A'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  Nomor WhatsApp Tujuan
                </label>
                <input
                  type="text"
                  value={nomorTujuan}
                  onChange={(e) => setNomorTujuan(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Step 3: Raw Template Editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-extrabold text-slate-700 block">
                  3. Format Pesan (Gunakan Variabel Otomatis)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Format Markdown WhatsApp Didukung (*bold*, _italic_)</span>
              </div>
              <textarea
                rows={6}
                value={pesanRaw}
                onChange={(e) => setPesanRaw(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Quick Variable Insertion Chips */}
            <div>
              <span className="font-bold text-slate-500 text-[11px] block mb-1.5">
                💡 Klik chip variabel untuk disisipkan ke pesan:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['{NAMA_SISWA}', '{KELAS}', '{NIS}', '{TANGGAL}', '{WAKTU}', '{NOMINAL_TAGIHAN}', '{JATUH_TEMPO}', '{NAMA_ACARA}', '{LINK_PORTAL}'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPesanRaw(prev => prev + ' ' + v)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border border-slate-200/80"
                  >
                    + {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSendWhatsApp}
                className="flex-1 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Send size={15} />
                <span>Buka & Kirim WhatsApp</span>
              </button>

              <button
                onClick={handleCopyMessage}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition flex items-center gap-1.5 cursor-pointer text-xs"
              >
                {isCopied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                <span>{isCopied ? 'Tersalin!' : 'Salin Pesan'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Phone Mockup: Live Preview (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-3">
          <div className="text-center">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 justify-center">
              <Smartphone size={15} className="text-slate-500" />
              <span>Simulasi Tampilan WhatsApp</span>
            </span>
          </div>

          {/* Smartphone Frame */}
          <div className="w-full max-w-sm bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800">
            {/* Camera notch */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2" />

            {/* Screen Inner */}
            <div className="bg-[#0b141a] rounded-[28px] overflow-hidden flex flex-col h-[520px]">
              {/* WhatsApp App Header */}
              <div className="bg-[#1f2c34] px-4 py-3 text-white flex items-center gap-3 border-b border-slate-800/60">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-black text-xs text-white">
                  {namaPenerima.charAt(0) || 'W'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">{namaPenerima}</h4>
                  <p className="text-[10px] text-emerald-400 font-mono truncate">{nomorTujuan || '62812xxxx'}</p>
                </div>
              </div>

              {/* Chat Canvas (Doodle style background) */}
              <div className="flex-1 p-3 overflow-y-auto bg-[#0b141a] flex flex-col justify-end space-y-2">
                {/* Date bubble */}
                <div className="mx-auto bg-[#182229] px-2.5 py-0.5 rounded-md text-[9px] text-slate-400 font-medium">
                  HARI INI
                </div>

                {/* Sent Message Bubble (Green) */}
                <div className="self-end max-w-[90%] bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-xs shadow-md text-[11px] leading-relaxed relative">
                  <div className="whitespace-pre-wrap font-sans">
                    {pesanRendered || 'Pesan belum dikonfigurasi...'}
                  </div>
                  <div className="text-[9px] text-emerald-200/60 text-right mt-1 font-mono flex items-center justify-end gap-1">
                    <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>✓✓</span>
                  </div>
                </div>
              </div>

              {/* Simulated Chat Input Bar */}
              <div className="bg-[#1f2c34] p-2 flex items-center gap-2 border-t border-slate-800/60">
                <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[10px] text-slate-400">
                  Ketik pesan...
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                  <Send size={13} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
