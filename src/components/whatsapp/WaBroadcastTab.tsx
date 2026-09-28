import React, { useState, useEffect } from 'react';
import { Radio, Send, Users, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { Siswa, WaTemplate, WaMessageLog } from '../../types';
import { db } from '../../data/db';

export default function WaBroadcastTab() {
  const [students, setStudents] = useState<Siswa[]>([]);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('PEMBERITAHUAN KEGIATAN AKADEMIK');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    const stds = db.get<Siswa>('siswa');
    const tpls = db.get<WaTemplate>('wa_templates');
    setStudents(stds);
    setTemplates(tpls);
    if (tpls.length > 0) {
      setSelectedTemplateId(tpls[0].id);
    }
  }, []);

  const classes = ['Semua', '4A', '4B', '5A', '5B', '6A', '6B'];

  const targetStudents = students.filter(s => {
    if (selectedClass === 'Semua') return true;
    return (s.kelas || '5A') === selectedClass;
  });

  const handleStartBroadcast = () => {
    if (targetStudents.length === 0) {
      alert('Tidak ada siswa di kelas yang dipilih!');
      return;
    }

    if (!confirm(`Mulai antrean pengiriman broadcast WhatsApp ke ${targetStudents.length} wali murid (Kelas: ${selectedClass})?`)) {
      return;
    }

    setIsProcessing(true);
    setSentCount(0);

    const existingLogs = db.get<WaMessageLog>('wa_message_logs');
    const newLogs: WaMessageLog[] = [];

    targetStudents.forEach((student, index) => {
      setTimeout(() => {
        const log: WaMessageLog = {
          id: `LOG-BC-${Date.now()}-${index}`,
          penerimaNama: student.namaWali || `Wali dari ${student.nama}`,
          penerimaNomor: student.teleponOrtu || '6281234567890',
          penerimaPeran: 'Wali Murid',
          kategori: 'Broadcast Massal',
          pesan: `[BROADCAST ${selectedClass}] ${customSubject}: Pemberitahuan resmi untuk siswa ananda ${student.nama}.`,
          status: 'Terkirim',
          waktu: new Date().toISOString().replace('T', ' ').slice(0, 19),
          petugas: 'Operator Broadcast'
        };
        newLogs.push(log);
        setSentCount(index + 1);

        if (index === targetStudents.length - 1) {
          setIsProcessing(false);
          db.set('wa_message_logs', [...newLogs, ...existingLogs]);
          alert(`Broadcast selesai! Berhasil memproses ${targetStudents.length} pesan.`);
        }
      }, (index + 1) * 300);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Radio size={16} className="text-emerald-500" />
              <span>Broadcast Pengumuman Massal via WhatsApp</span>
            </h3>
            <p className="text-xs text-slate-400">Kirim notifikasi serentak per rombongan belajar / seluruh sekolah</p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200">
            {targetStudents.length} Target Kontak
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Pilih Sasaran Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              {classes.map(c => (
                <option key={c} value={c}>{c === 'Semua' ? 'Semua Kelas (Seluruh Sekolah)' : `Kelas ${c}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Pilih Template Broadcast</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>[{t.kategori}] {t.namaTemplate}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Judul / Perihal Broadcast</label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Target Table Preview */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Daftar Wali Murid Penerima ({targetStudents.length} Siswa)</span>
            <span className="font-mono text-emerald-700">Status: Siap Kirim</span>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
            {targetStudents.map((s, idx) => (
              <div key={s.id} className="px-4 py-2 flex items-center justify-between hover:bg-slate-50/80">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 font-mono text-slate-400 text-[10px]">{idx + 1}.</span>
                  <div>
                    <strong className="text-slate-800">{s.nama}</strong>
                    <span className="text-[10px] text-slate-400 ml-2">Wali: {s.namaWali || 'Wali Murid'}</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                  {s.teleponOrtu || '0851-4180-9991'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar if processing */}
        {isProcessing && (
          <div className="space-y-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="flex justify-between text-xs font-bold text-emerald-900">
              <span>Mengirim Antrean Broadcast...</span>
              <span className="font-mono">{sentCount} / {targetStudents.length} Terkirim</span>
            </div>
            <div className="h-2.5 w-full bg-emerald-200 rounded-full overflow-hidden">
              <div
                style={{ width: `${(sentCount / targetStudents.length) * 100}%` }}
                className="h-full bg-emerald-600 transition-all duration-200"
              />
            </div>
          </div>
        )}

        {/* Start Button */}
        <div className="flex justify-end">
          <button
            onClick={handleStartBroadcast}
            disabled={isProcessing}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-2xl transition shadow-md flex items-center gap-2 cursor-pointer text-xs"
          >
            <Send size={16} />
            <span>{isProcessing ? 'Sedang Memproses...' : 'Kirim Broadcast Sekarang'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
