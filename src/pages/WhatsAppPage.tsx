import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Search, Filter, Copy, Check, ExternalLink, 
  Users, AlertCircle, Phone, Calendar, Clock, Sparkles, CheckCircle2, 
  CreditCard, GraduationCap, Megaphone, Smartphone, RefreshCw, Download, FileSpreadsheet
} from 'lucide-react';
import { useStore } from '../store';
import { WhatsAppMessage } from '../types';
import { WA_TEMPLATES, INITIAL_WA_MESSAGES, formatWaPhone, generateWaLink } from '../data/whatsappSeed';
import { db } from '../data/db';
import { exportToExcel } from '../lib/excel';

export default function WhatsAppPage() {
  const { students, teachers, settings } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'generator' | 'broadcast' | 'riwayat' | 'template'>('generator');

  // Stored messages
  const [messages, setMessages] = useState<WhatsAppMessage[]>(() => {
    const saved = db.get<WhatsAppMessage>('wa_messages');
    return (saved && saved.length > 0) ? saved : INITIAL_WA_MESSAGES;
  });

  useEffect(() => {
    db.set('wa_messages', messages);
  }, [messages]);

  // Generator State
  const [selectedKategori, setSelectedKategori] = useState<'Presensi' | 'Tagihan' | 'Pengumuman' | 'Akademik'>('Presensi');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [targetName, setTargetName] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Dynamic variables for templates
  const [customVars, setCustomVars] = useState({
    waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    statusAbsen: 'Hadir',
    bulan: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    nominal: '150.000',
    namaBiaya: 'Iuran Pendidikan Bulanan',
    waliKelas: 'Wali Kelas',
    hariTanggal: 'Sabtu, 30 Agustus 2026',
    jam: '08.30 WIB',
    tempat: 'Aula Utama Sekolah',
  });

  // Broadcast Class Filter
  const [broadcastClass, setBroadcastClass] = useState<string>('Semua');
  const [broadcastSearch, setBroadcastSearch] = useState<string>('');

  // Auto-populate when student is selected
  useEffect(() => {
    if (selectedStudentId) {
      const s = students.find(item => item.id === selectedStudentId);
      if (s) {
        const pName = s.parentName || s.namaAyah || s.namaIbu || s.namaWali || `Orang Tua dari ${s.name}`;
        setTargetName(pName);
        const rawPhone = s.parentPhone || s.tlpAyah || s.tlpIbu || s.tlpWali || s.telepon || (s as any).teleponOrtu || (s as any).noHp || (s as any).noWa || '';
        setTargetPhone(rawPhone);

        // Check if student has attendance in db
        const attendances = db.get<any>('absensi') || db.get<any>('presensi') || [];
        const todayStr = new Date().toISOString().split('T')[0];
        const studentAtt = attendances.find((a: any) => (a.studentId === s.id || a.nis === s.nis) && a.date === todayStr);
        let updatedStatus = customVars.statusAbsen;
        let updatedWaktu = customVars.waktu;
        if (studentAtt) {
          updatedStatus = studentAtt.status || 'Hadir';
          updatedWaktu = studentAtt.time || customVars.waktu;
        }

        // Check if student has unpaid bills in db
        const financeBills = db.get<any>('tagihan') || db.get<any>('finance_bills') || [];
        const unpaid = financeBills.find((b: any) => (b.studentId === s.id || b.nis === s.nis) && b.status !== 'LUNAS');
        let updatedNominal = customVars.nominal;
        let updatedNamaBiaya = customVars.namaBiaya;
        if (unpaid) {
          updatedNominal = Number(unpaid.nominal || unpaid.amount || 150000).toLocaleString('id-ID');
          updatedNamaBiaya = unpaid.title || unpaid.posName || 'Iuran Pendidikan Bulanan';
        }

        const nextVars = {
          ...customVars,
          statusAbsen: updatedStatus,
          waktu: updatedWaktu,
          nominal: updatedNominal,
          namaBiaya: updatedNamaBiaya
        };
        setCustomVars(nextVars);
        generateTemplateMessage(s, nextVars);
      }
    }
  }, [selectedStudentId]);

  const generateTemplateMessage = (studentObj?: any, varsOverride?: typeof customVars) => {
    const s = studentObj || students.find(item => item.id === selectedStudentId) || students[0];
    const vars = varsOverride || customVars;
    const namaSiswa = s?.name || 'Ahmad Fauzi';
    const kelas = s?.class || (s as any)?.kelas || 'Kelas VII-A';
    const namaSekolah = settings.namaSekolah || settings.schoolName || 'SISTA ROMBEL';

    let msg = '';
    if (selectedKategori === 'Presensi') {
      if (vars.statusAbsen === 'Hadir') {
        msg = `Bapak/Ibu Orang Tua dari *${namaSiswa}* (Kelas ${kelas}), kami informasikan bahwa ananda telah hadir dan melakukan presensi masuk di sekolah pada *${vars.waktu}* WIB dalam keadaan sehat. Terima kasih atas perhatiannya.\n\n- ${namaSekolah}`;
      } else {
        msg = `Yth. Orang Tua/Wali dari *${namaSiswa}* (Kelas ${kelas}), ananda tercatat *belum hadir / ${vars.statusAbsen}* pada KBM hari ini tanggal ${vars.tanggal}. Mohon konfirmasi mengenai kondisi ananda ke Wali Kelas atau membalas pesan ini.\n\n- ${namaSekolah}`;
      }
    } else if (selectedKategori === 'Tagihan') {
      msg = `Yth. Bapak/Ibu Wali dari *${namaSiswa}* (Kelas ${kelas}), kami sampaikan rincian tagihan pendidikan bulan *${vars.bulan}* sebesar *Rp ${vars.nominal}* untuk pos *${vars.namaBiaya}*. Pembayaran dapat dilakukan melalui loket tata usaha sekolah. Terima kasih.\n\n- Bendahara ${namaSekolah}`;
    } else if (selectedKategori === 'Pengumuman') {
      msg = `Yth. Bapak/Ibu Orang Tua Murid ${namaSekolah}, kami mengundang kehadiran Bapak/Ibu pada agenda sekolah yang diselenggarakan pada *${vars.hariTanggal}* pukul *${vars.jam}* bertempat di *${vars.tempat}*. Kehadiran Bapak/Ibu sangat berharga bagi kemajuan siswa.\n\n- ${namaSekolah}`;
    } else {
      msg = `Pemberitahuan Akademik: Pelaksanaan Asesmen Sumatif ananda *${namaSiswa}* (Kelas ${kelas}) akan dimulai tanggal *${vars.tanggal}*. Mohon bimbingan belajar di rumah. Kartu tes dapat diakses via Portal Siswa.\n\n- ${namaSekolah}`;
    }

    setCustomMessage(msg);
  };

  useEffect(() => {
    generateTemplateMessage();
  }, [selectedKategori, customVars]);

  const handleCopyText = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!targetPhone) {
      alert('Mohon masukkan nomor WhatsApp tujuan!');
      return;
    }

    const waLink = generateWaLink(targetPhone, customMessage);
    
    // Save to sent history
    const newMsg: WhatsAppMessage = {
      id: `WA-${Date.now().toString().slice(-4)}`,
      kategori: selectedKategori,
      penerimaNama: targetName || 'Penerima',
      penerimaRole: 'Orang Tua',
      nomorHp: formatWaPhone(targetPhone),
      isiPesan: customMessage,
      status: 'Terkirim',
      waktuKirim: new Date().toLocaleString('id-ID'),
      pengirim: 'Admin Sekolah',
    };

    setMessages(prev => [newMsg, ...prev]);

    // Open WhatsApp
    window.open(waLink, '_blank');
  };

  // Get distinct classes using class and fallback
  const classList = Array.from(new Set(students.map(s => s.class || (s as any).kelas).filter(Boolean))).sort();

  const broadcastStudents = students.filter(s => {
    const sClass = s.class || (s as any).kelas || '';
    const matchClass = broadcastClass === 'Semua' || sClass === broadcastClass;
    const matchSearch = broadcastSearch === '' || 
      s.name.toLowerCase().includes(broadcastSearch.toLowerCase()) || 
      (s.nis || '').includes(broadcastSearch) || 
      (s.parentName || s.namaAyah || '').toLowerCase().includes(broadcastSearch.toLowerCase());
    return matchClass && matchSearch;
  });

  const handleExportWaLog = () => {
    const rows = messages.map((m, idx) => ({
      'No': idx + 1,
      'ID Pesan': m.id,
      'Kategori': m.kategori,
      'Nama Penerima': m.penerimaNama,
      'Role': m.penerimaRole,
      'Nomor WhatsApp': m.nomorHp,
      'Isi Notifikasi': m.isiPesan,
      'Status': m.status,
      'Waktu Kirim': m.waktuKirim,
      'Pengirim': m.pengirim
    }));
    exportToExcel(rows, `Log_WhatsApp_Gateway_${new Date().toISOString().slice(0, 10)}.xlsx`, 'LOG_WHATSAPP');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-green-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-xs">
              <Smartphone size={24} className="text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-white/10 rounded-full border border-white/20">
              Pusat Komunikasi & Notifikasi
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">WhatsApp Notification Center</h1>
          <p className="text-emerald-100 text-xs sm:text-sm">
            Kirim notifikasi presensi harian, tagihan iuran, jadwal ujian, dan surat edaran resmi langsung ke WhatsApp Orang Tua
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportWaLog}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl text-xs backdrop-blur-xs border border-white/20 transition cursor-pointer"
          >
            <Download size={14} />
            <span>Ekspor Log Pesan (.xlsx)</span>
          </button>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-100">Gateway: Siap Kirim</span>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl gap-1 max-w-2xl">
        <button
          onClick={() => setActiveSubTab('generator')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'generator' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send size={14} />
          <span>Generator Notifikasi Satuan</span>
        </button>
        <button
          onClick={() => setActiveSubTab('broadcast')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'broadcast' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={14} />
          <span>Broadcast Per Kelas ({students.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('riwayat')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'riwayat' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock size={14} />
          <span>Riwayat Pesan ({messages.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: GENERATOR SATUAN */}
      {activeSubTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Settings */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-600" />
              <span>Pengaturan Pesan WhatsApp</span>
            </h3>

            {/* Kategori Selector */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Pilih Kategori Notifikasi:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Presensi', label: 'Presensi Siswa', icon: Clock },
                  { id: 'Tagihan', label: 'Iuran & Tagihan', icon: CreditCard },
                  { id: 'Akademik', label: 'Akademik & Ujian', icon: GraduationCap },
                  { id: 'Pengumuman', label: 'Pengumuman/Edaran', icon: Megaphone },
                ].map(cat => {
                  const Icon = cat.icon;
                  const isSelected = selectedKategori === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedKategori(cat.id as any)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black shadow-xs ring-2 ring-emerald-400/30'
                          : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-600 font-bold'
                      }`}
                    >
                      <Icon size={18} className={isSelected ? 'text-emerald-600' : 'text-slate-400'} />
                      <span className="text-[11px] text-center">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student Picker */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Pilih Siswa / Penerima:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Pilih Siswa dari Database ({students.length} Siswa) --</option>
                {students.map(s => {
                  const phone = s.parentPhone || s.tlpAyah || s.tlpIbu || s.telepon || (s as any).teleponOrtu || (s as any).noHp || (s as any).noWa || 'Belum diisi';
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} • Kelas {s.class || (s as any).kelas || '-'} (No. WA: {phone})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Dynamic Options for Presensi */}
            {selectedKategori === 'Presensi' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Status Kehadiran</label>
                  <select
                    value={customVars.statusAbsen}
                    onChange={e => setCustomVars({ ...customVars, statusAbsen: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Hadir">Hadir Tepat Waktu</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Sakit">Sakit (Izin Sakit)</option>
                    <option value="Izin">Izin Keperluan Keluarga</option>
                    <option value="Alpa">Alpa (Tanpa Keterangan)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Waktu Presensi</label>
                  <input
                    type="text"
                    value={customVars.waktu}
                    onChange={e => setCustomVars({ ...customVars, waktu: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    placeholder="07:15"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Options for Tagihan */}
            {selectedKategori === 'Tagihan' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Nama Pos Biaya</label>
                  <input
                    type="text"
                    value={customVars.namaBiaya}
                    onChange={e => setCustomVars({ ...customVars, namaBiaya: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Nominal Tagihan (Rp)</label>
                  <input
                    type="text"
                    value={customVars.nominal}
                    onChange={e => setCustomVars({ ...customVars, nominal: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {/* Target Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Nama Orang Tua / Wali</label>
                <input
                  type="text"
                  value={targetName}
                  onChange={e => setTargetName(e.target.value)}
                  placeholder="Bpk / Ibu ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Nomor WhatsApp Tujuan *</label>
                <input
                  type="text"
                  value={targetPhone}
                  onChange={e => setTargetPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-800"
                />
              </div>
            </div>

            {/* Message Body Input */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Editor Redaksi Pesan:</label>
              <textarea
                rows={5}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-sans leading-relaxed"
                placeholder="Tulis atau sesuaikan isi pesan di sini..."
              />
            </div>
          </div>

          {/* WhatsApp Simulator Preview */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-[#121b22] text-white p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between flex-grow space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-black text-sm">
                    {targetName ? targetName.charAt(0).toUpperCase() : 'W'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">{targetName || 'Orang Tua Murid'}</h4>
                    <span className="text-[10px] text-emerald-400 font-mono">{targetPhone || '+62 812-xxxx-xxxx'}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded">
                  Live Preview
                </span>
              </div>

              {/* Chat Bubble */}
              <div className="flex-grow flex flex-col justify-end p-2 space-y-2">
                <div className="self-end max-w-[90%] bg-[#005c4b] text-emerald-50 p-3.5 rounded-2xl rounded-tr-xs shadow-md text-xs font-sans space-y-2">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {customMessage || 'Pilih siswa untuk membuat pesan notifikasi otomatis...'}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-300 font-mono">
                    <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    <Check size={12} className="text-sky-300" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <button
                  onClick={handleSendWhatsApp}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Send size={16} />
                  <span>Kirim Pesan via WhatsApp Sekarang</span>
                  <ExternalLink size={14} />
                </button>

                <button
                  onClick={handleCopyText}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Teks Berhasil Disalin!' : 'Salin Teks Pesan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: BROADCAST PER KELAS */}
      {activeSubTab === 'broadcast' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-base text-slate-900">Daftar Kontak WhatsApp Per Rombel/Kelas</h3>
              <p className="text-xs text-slate-500">Kirim pesan massal dengan membuka tautan WhatsApp masing-masing orang tua dalam satu klik</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa/ortu..."
                  value={broadcastSearch}
                  onChange={e => setBroadcastSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <select
                value={broadcastClass}
                onChange={e => setBroadcastClass(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="Semua">Semua Kelas ({students.length})</option>
                {classList.map(c => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table List */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 pl-4">No</th>
                  <th className="p-3">Nama Siswa & Kelas</th>
                  <th className="p-3">Nama Orang Tua / Wali</th>
                  <th className="p-3">Nomor WhatsApp</th>
                  <th className="p-3 pr-4 text-right">Aksi Kirim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {broadcastStudents.map((s, idx) => {
                  const rawPhone = s.parentPhone || s.tlpAyah || s.tlpIbu || s.telepon || (s as any).teleponOrtu || (s as any).noHp || (s as any).noWa || '';
                  const hasPhone = rawPhone && rawPhone.length > 5;
                  const sClass = s.class || (s as any).kelas || 'Siswa';
                  const waText = `Yth. Orang Tua dari *${s.name}* (Kelas ${sClass}), kami menginformasikan pengumuman penting sekolah. Terima kasih. - ${settings.namaSekolah || settings.schoolName || 'SISTA ROMBEL'}`;
                  const waLink = hasPhone ? generateWaLink(rawPhone, waText) : '#';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 pl-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn || s.nis || '-'} • Kelas {sClass}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        {s.parentName || s.namaAyah || s.namaIbu || s.namaWali || 'Orang Tua / Wali'}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {hasPhone ? (
                          <span className="text-emerald-700">{rawPhone}</span>
                        ) : (
                          <span className="text-rose-500 italic text-[11px]">Belum diisi di biodata</span>
                        )}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        {hasPhone ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] transition shadow-2xs active:scale-95"
                          >
                            <Send size={12} />
                            <span>Buka WA</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">Tidak ada nomor</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: RIWAYAT PESAN */}
      {activeSubTab === 'riwayat' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-base text-slate-900">Riwayat Pengiriman Notifikasi WhatsApp</h3>
              <p className="text-xs text-slate-500">Log pesan yang telah digenerate dan dikirim melalui aplikasi</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Bersihkan riwayat pesan WA?')) setMessages([]);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold rounded-xl text-xs transition"
            >
              Hapus Semua Riwayat
            </button>
          </div>

          <div className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      {msg.kategori}
                    </span>
                    <span className="font-bold text-slate-900">{msg.penerimaNama}</span>
                    <span className="font-mono text-slate-400">({msg.nomorHp})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{msg.waktuKirim}</span>
                </div>
                <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                  {msg.isiPesan}
                </p>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada riwayat pesan yang dikirim.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
