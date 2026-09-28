import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../data/db';
import { 
  HeartHandshake, GraduationCap, Calendar, CheckSquare, 
  CreditCard, Award, ShieldAlert, CheckCircle2, 
  User, Printer, Sparkles, Wallet, Bell, Clock, LogOut,
  ShieldCheck, Lock, Phone, MessageSquare, BookOpen, AlertCircle, FileText
} from 'lucide-react';
import { getActiveRole } from '../lib/permissions';
import PengajuanIzinPortal from '../components/portal/PengajuanIzinPortal';

interface PortalOrangTuaProps {
  studentOverrideId?: string;
  isLockedParent?: boolean;
  onLogout?: () => void;
}

export default function PortalOrangTua({ studentOverrideId, isLockedParent, onLogout }: PortalOrangTuaProps) {
  const { students, teachers, settings } = useStore();
  const currentRole = getActiveRole();
  const isActualParentRole = currentRole.id === 'RL-027' || !!isLockedParent || !!studentOverrideId;

  // Selected Student state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (studentOverrideId) return studentOverrideId;
    const saved = typeof window !== 'undefined' && window.sessionStorage ? sessionStorage.getItem('portal_parent_student_id') : null;
    if (saved && students.some(s => s.id === saved || s.nisn === saved)) return saved;
    return students.length > 0 ? students[0].id : '';
  });

  useEffect(() => {
    if (studentOverrideId) {
      setSelectedStudentId(studentOverrideId);
    } else if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [studentOverrideId, students]);

  const activeChild = useMemo(() => {
    const found = students.find(s => s.id === selectedStudentId || s.nisn === selectedStudentId);
    if (found) return found;
    return students.length > 0 ? students[0] : null;
  }, [students, selectedStudentId]);

  // If locked parent, find all children belonging to this parent (by phone, parent name, or active child)
  const parentChildren = useMemo(() => {
    if (!activeChild) return [];
    if (!isActualParentRole) return students; // Admin view can select anyone
    
    // Filter siblings sharing phone or parent name
    const parentPhone = (activeChild.parentPhone || activeChild.phone || '').trim();
    const parentName = (activeChild.parentName || activeChild.fatherName || activeChild.NamaIbu || '').trim().toLowerCase();

    const siblings = students.filter(s => {
      if (s.id === activeChild.id) return true;
      if (parentPhone && (s.parentPhone === parentPhone || s.phone === parentPhone)) return true;
      if (parentName && parentName.length > 3 && (
        (s.parentName && s.parentName.toLowerCase() === parentName) ||
        (s.fatherName && s.fatherName.toLowerCase() === parentName) ||
        (s.NamaIbu && s.NamaIbu.toLowerCase() === parentName)
      )) return true;
      return false;
    });

    return siblings.length > 0 ? siblings : [activeChild];
  }, [students, activeChild, isActualParentRole]);

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'presensi' | 'perizinan' | 'nilai' | 'tagihan' | 'konseling'>('ringkasan');

  // Homeroom teacher for active child
  const waliKelas = useMemo(() => {
    if (!activeChild) return { name: 'Belum Ditentukan', phone: '' };
    const rombelList = (db.get('rombel') as any[]) || [];
    const matchedRombel = rombelList.find(r => r.name === activeChild.class || r.nama === activeChild.class);
    const t = teachers.find(teach => teach.assignedClass === activeChild.class || teach.name === matchedRombel?.homeroomTeacher);
    return {
      name: matchedRombel?.homeroomTeacher || matchedRombel?.walikelasName || t?.name || `Wali Kelas ${activeChild.class}`,
      phone: t?.phone || '08123456789'
    };
  }, [activeChild, teachers]);

  // Attendance for active child
  const childAbsensi = useMemo(() => {
    if (!activeChild) return { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, percentage: 100 };
    const allAbsen = (db.get('absensi') as any[]) || [];
    const myAbsen = allAbsen.filter(a => a.studentId === activeChild.id || a.nisn === activeChild.nisn || a.nama === activeChild.name);
    let h = 0, s = 0, i = 0, a = 0;
    myAbsen.forEach(rec => {
      const st = String(rec.status || '').toLowerCase();
      if (st.includes('hadir') || st === 'h') h++;
      else if (st.includes('sakit') || st === 's') s++;
      else if (st.includes('izin') || st === 'i') i++;
      else if (st.includes('alpa') || st.includes('tanpa') || st === 'a') a++;
      else h++;
    });
    const total = h + s + i + a;
    const percentage = total > 0 ? Math.round((h / total) * 100) : 100;
    return { hadir: h, sakit: s, izin: i, alpa: a, total, percentage };
  }, [activeChild]);

  if (!activeChild) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <p className="text-sm font-bold text-slate-700">Data Siswa / Anak Belum Ditemukan</p>
        <p className="text-xs text-slate-400">Silakan hubungi bagian Tata Usaha sekolah untuk konfirmasi data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Header Ortu */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black shrink-0">
              {activeChild.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  PORTAL RESMI WALI MURID
                </span>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-300/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Lock size={10} /> Data Privat
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1">{activeChild.name}</h1>
              <p className="text-xs text-indigo-200">
                Kelas {activeChild.class} • NISN: {activeChild.nisn || activeChild.nis || '-'} • Wali Kelas: {waliKelas.name}
              </p>
            </div>
          </div>

          {/* Child Selector or Verified Badge */}
          <div className="flex items-center gap-2">
            {parentChildren.length > 1 ? (
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex items-center gap-2">
                <span className="text-xs text-indigo-100 font-medium px-2">Pilih Anak ({parentChildren.length}):</span>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    if (typeof window !== 'undefined' && window.sessionStorage) {
                      sessionStorage.setItem('portal_parent_student_id', e.target.value);
                    }
                  }}
                  className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl outline-hidden"
                >
                  {parentChildren.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
                  ))}
                </select>
              </div>
            ) : !isActualParentRole ? (
              /* Admin Simulator */
              <div className="bg-amber-500/20 backdrop-blur-md p-2 rounded-2xl border border-amber-300/40 flex items-center gap-2">
                <span className="text-[10px] text-amber-200 font-extrabold uppercase px-2">Pratinjau Admin:</span>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    if (typeof window !== 'undefined' && window.sessionStorage) {
                      sessionStorage.setItem('portal_parent_student_id', e.target.value);
                    }
                  }}
                  className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl outline-hidden"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-300" />
                <span className="text-xs font-bold">{activeChild.name}</span>
              </div>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-2 bg-rose-500/80 hover:bg-rose-600 active:scale-95 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Keluar Sesi Orang Tua"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { id: 'ringkasan', label: 'Ringkasan Perkembangan', icon: Sparkles },
          { id: 'presensi', label: 'Presensi Kehadiran', icon: Calendar },
          { id: 'perizinan', label: 'Surat Izin & Sakit', icon: FileText },
          { id: 'nilai', label: 'Nilai & Rapor', icon: Award },
          { id: 'tagihan', label: 'Tagihan Biaya & Tabungan', icon: CreditCard },
          { id: 'konseling', label: 'Hubungi Wali Kelas', icon: MessageSquare },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
                isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Ringkasan */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Kehadiran Anak</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600">{childAbsensi.percentage}%</p>
              <p className="text-xs text-slate-500">{childAbsensi.hadir} Hadir • {childAbsensi.sakit} Sakit • {childAbsensi.izin} Izin</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Rata-Rata Nilai Rapor</span>
                <Award size={16} className="text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-indigo-600">86.8 <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Predikat A</span></p>
              <p className="text-xs text-slate-500">Capaian Akademik Semester Aktif</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Status Pembayaran Biaya</span>
                <CreditCard size={16} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600">Lunas</p>
              <p className="text-xs text-slate-500">Bulan aktif berjalan lancar</p>
            </div>
          </div>

          {/* Quick Notice from Homeroom Teacher */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider bg-blue-100 px-2.5 py-0.5 rounded-full">
                Pesan Wali Kelas {activeChild.class}
              </span>
              <h4 className="text-sm font-black text-slate-900">{waliKelas.name}</h4>
              <p className="text-xs text-slate-600 max-w-xl">
                Ananda {activeChild.name} aktif berpartisipasi dalam pembelajaran dan menjaga tata tertib dengan sangat baik di kelas.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('konseling')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Phone size={13} />
              <span>Hubungi Guru</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Presensi */}
      {activeTab === 'presensi' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" />
              <span>Presensi Kehadiran {activeChild.name}</span>
            </h3>
            <button
              onClick={() => setActiveTab('perizinan')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <FileText size={14} />
              <span>+ Buat Surat Izin / Sakit</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
              <p className="text-xs font-bold text-emerald-800">Hadir</p>
              <p className="text-2xl font-black text-emerald-950 mt-1">{childAbsensi.hadir} Hari</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
              <p className="text-xs font-bold text-blue-800">Sakit</p>
              <p className="text-2xl font-black text-blue-950 mt-1">{childAbsensi.sakit} Hari</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
              <p className="text-xs font-bold text-amber-800">Izin</p>
              <p className="text-2xl font-black text-amber-950 mt-1">{childAbsensi.izin} Hari</p>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
              <p className="text-xs font-bold text-rose-800">Alpa</p>
              <p className="text-2xl font-black text-rose-950 mt-1">{childAbsensi.alpa} Hari</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Perizinan & Surat Izin/Sakit */}
      {activeTab === 'perizinan' && (
        <PengajuanIzinPortal
          student={activeChild}
          submittedBy="Orang Tua"
          parentDefaultName={activeChild.parentName || activeChild.namaAyah || activeChild.namaIbu}
          parentDefaultPhone={activeChild.parentPhone || activeChild.phone}
        />
      )}

      {/* Tab 3: Nilai */}
      {activeTab === 'nilai' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award size={16} className="text-amber-500" />
              <span>Hasil Capaian Belajar (Rapor Digital {activeChild.name})</span>
            </h3>
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1 hover:bg-indigo-100 transition cursor-pointer">
              <Printer size={13} />
              <span>Cetak Rapor</span>
            </button>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-3">
            <div className="flex justify-between font-bold pb-2 border-b border-slate-200">
              <span>Mata Pelajaran</span>
              <span>Nilai Akhir & Predikat</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Pendidikan Agama & Budi Pekerti</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">88 (A)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Pendidikan Pancasila</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">86 (A)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Bahasa Indonesia</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">90 (A)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Matematika</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">84 (B)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Ilmu Pengetahuan Alam & Sosial (IPAS)</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">87 (A)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Bahasa Inggris</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">92 (A)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Biaya & Tagihan */}
      {activeTab === 'tagihan' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <CreditCard size={16} className="text-emerald-600" />
            <span>Tagihan Biaya & Tabungan {activeChild.name}</span>
          </h3>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-emerald-900">Status Pembayaran Biaya Pendidikan</p>
              <p className="text-[11px] text-emerald-700">Semua tagihan s/d bulan berjalan telah LUNAS.</p>
            </div>
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black">LUNAS</span>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-indigo-900">Saldo Buku Tabungan Siswa</p>
              <p className="text-[11px] text-indigo-700">Tersimpan aman di kas administrasi sekolah.</p>
            </div>
            <span className="text-sm font-mono font-black text-indigo-800">Rp 250.000</span>
          </div>
        </div>
      )}

      {/* Tab 5: Konseling & Kontak Wali Kelas */}
      {activeTab === 'konseling' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <MessageSquare size={16} className="text-indigo-600" />
            <span>Kontak & Konsultasi dengan Wali Kelas</span>
          </h3>

          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                {waliKelas.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">{waliKelas.name}</h4>
                <p className="text-xs text-slate-500">Wali Kelas {activeChild.class}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bapak/Ibu wali murid dapat berkonsultasi mengenai perkembangan akademik, kedisiplinan, maupun izin tidak masuk sekolah ananda.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href={`https://wa.me/${waliKelas.phone.replace(/[^0-9]/g, '')}?text=Assalamu%27alaikum%20Bapak%2FIbu%20${encodeURIComponent(waliKelas.name)}%2C%20saya%20orang%20tua%20dari%20${encodeURIComponent(activeChild.name)}%20(Kelas%20${encodeURIComponent(activeChild.class)})`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Phone size={13} />
                <span>Hubungi via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

