import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { formatClassLabel, triggerPrint } from '../lib/utils';
import { fetchFromGAS } from '../lib/api';
import { DEFAULT_APP_CONFIG } from '../data/config';
import { 
  Award, Search, Printer, Edit2, RotateCcw, FileSpreadsheet, 
  ExternalLink, X, Save, CheckCircle2, GraduationCap, FileText, UserCheck,
  Eye, Check, AlertCircle, Plus, Download, Trash2, Edit, AlertTriangle
} from 'lucide-react';
import { exportToExcel } from '../lib/excel';

export default function AlumniList() {
  const { 
    students, updateStudent, deleteStudent, settings
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);
  const [printSklStudent, setPrintSklStudent] = useState<Student | null>(null);
  const [showGraduateModal, setShowGraduateModal] = useState(false);
  const [selectedStudentToGraduate, setSelectedStudentToGraduate] = useState('');
  const [notificationMsg, setNotificationMsg] = useState('');

  const gasUrl = settings.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
  const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;

  const alumniList = useMemo(() => {
    return students.filter(s => s && s.status === 'Lulus');
  }, [students]);

  const activeStudents = useMemo(() => {
    return students.filter(s => s && s.status !== 'Lulus' && s.status !== 'Pindah' && s.status !== 'Keluar');
  }, [students]);

  const filteredAlumni = useMemo(() => {
    if (!searchTerm) return alumniList;
    const term = String(searchTerm || '').toLowerCase();
    return alumniList.filter(s => {
      if (!s) return false;
      return String(s.name || '').toLowerCase().includes(term) ||
        (s.nisn && String(s.nisn).includes(term)) ||
        (s.nis && String(s.nis).includes(term)) ||
        (s.class && String(s.class).toLowerCase().includes(term));
    });
  }, [alumniList, searchTerm]);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 4000);
  };

  const handleReactivateStudent = (id: string, name: string) => {
    if (window.confirm(`Batalkan status kelulusan dan kembalikan ${name} menjadi siswa Aktif?`)) {
      updateStudent(id, { status: 'Aktif' });
      const currentList = useStore.getState().students;
      const nextList = currentList.map(s => s.id === id ? { ...s, status: 'Aktif' as const, updatedAt: new Date().toISOString() } : s);
      if (gasUrl) {
        fetchFromGAS(gasUrl, {
          action: 'sync',
          data: nextList,
          teachers: useStore.getState().teachers,
          spreadsheetId: spreadsheetId
        }).catch(err => console.warn("Sync error:", err));
      }
      showNotification(`Status kelulusan ${name} berhasil dibatalkan (Kembali Aktif).`);
    }
  };

  const handleGraduateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentToGraduate) return;
    const student = students.find(s => s.id === selectedStudentToGraduate);
    if (student) {
      updateStudent(student.id, { status: 'Lulus' });
      const currentList = useStore.getState().students;
      const nextList = currentList.map(s => s.id === student.id ? { ...s, status: 'Lulus' as const, updatedAt: new Date().toISOString() } : s);
      if (gasUrl) {
        fetchFromGAS(gasUrl, {
          action: 'sync',
          data: nextList,
          teachers: useStore.getState().teachers,
          spreadsheetId: spreadsheetId
        }).catch(err => console.warn("Sync error:", err));
      }
      showNotification(`Siswa ${student.name} berhasil diluluskan sebagai Alumni!`);
      setSelectedStudentToGraduate('');
      setShowGraduateModal(false);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    updateStudent(editingStudent.id, editingStudent);
    const currentList = useStore.getState().students;
    const nextList = currentList.map(s => s.id === editingStudent.id ? { ...s, ...editingStudent, updatedAt: new Date().toISOString() } : s);
    if (gasUrl) {
      fetchFromGAS(gasUrl, {
        action: 'sync',
        data: nextList,
        teachers: useStore.getState().teachers,
        spreadsheetId: spreadsheetId
      }).catch(err => console.warn("Sync error:", err));
    }
    showNotification(`Data alumni ${editingStudent.name} berhasil diperbarui.`);
    setEditingStudent(null);
  };

  const handleDeleteAlumni = (student: Student) => {
    deleteStudent(student.id);
    const currentList = useStore.getState().students;
    const nextList = currentList.filter(s => s.id !== student.id);
    if (gasUrl) {
      fetchFromGAS(gasUrl, {
        action: 'sync',
        data: nextList,
        teachers: useStore.getState().teachers,
        spreadsheetId: spreadsheetId
      }).catch(err => console.warn("Sync error:", err));
    }
    showNotification(`Data alumni ${student.name} berhasil dihapus.`);
    setDeleteConfirmStudent(null);
  };

  const handleExportAlumni = () => {
    if (filteredAlumni.length === 0) {
      alert("Tidak ada data alumni untuk diekspor.");
      return;
    }
    const dataToExport = filteredAlumni.map((s, idx) => ({
      No: idx + 1,
      "Nama Alumni": s.name,
      NISN: s.nisn || '-',
      NIS: s.nis || '-',
      "Jenis Kelamin": s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      "Kelas Terakhir": s.class || '-',
      "Tempat Lahir": s.pob || '-',
      "Tanggal Lahir": s.dob || '-',
      "Nama Orang Tua": s.parentName || s.fatherName || '-',
      "No HP/WA": s.phone || s.parentPhone || '-',
      "Alamat": s.address || '-',
      "Tahun Lulus": settings.tahunPelajaran || '2026/2027',
      Status: 'LULUS'
    }));
    exportToExcel(dataToExport, `Data_Alumni_Lulusan_${settings.tahunPelajaran || '2026-2027'}.xlsx`);
    showNotification("Data Alumni berhasil diekspor ke Excel!");
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
      {notificationMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{notificationMsg}</span>
          <button onClick={() => setNotificationMsg('')} className="text-emerald-600 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="text-amber-500" size={20} />
            Data Alumni & Lulusan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Daftar siswa yang telah menyelesaikan pendidikan (Status: Lulus).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleExportAlumni}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition active:scale-95"
            title="Ekspor ke Excel"
          >
            <Download size={14} />
            <span>Ekspor Excel</span>
          </button>
          <button 
            onClick={() => setShowGraduateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Plus size={14} />
            <span>Luluskan Siswa</span>
          </button>
          <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-2 rounded-xl border border-amber-200/60">
            Total Alumni: {alumniList.length} Siswa
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama alumni, NISN, atau kelas terakhir..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {filteredAlumni.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <GraduationCap size={40} className="mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-600 text-sm">Belum Ada Data Alumni</p>
          <p className="text-xs text-slate-400 mt-1">Siswa dengan status 'Lulus' akan otomatis tercatat di sini.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-4">No</th>
                <th className="p-3.5">Nama Alumni</th>
                <th className="p-3.5">NISN / NIS</th>
                <th className="p-3.5">L/P</th>
                <th className="p-3.5">Kelas Terakhir</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Aksi & Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAlumni.map((student, idx) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 pl-4 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-900">{student.name}</td>
                  <td className="p-3.5 text-slate-500 font-mono">{student.nisn || '-'} / {student.nis || '-'}</td>
                  <td className="p-3.5 font-semibold">{student.gender}</td>
                  <td className="p-3.5"><span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">{formatClassLabel(student.class, true)}</span></td>
                  <td className="p-3.5"><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">Lulus</span></td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Lihat Detail Alumni"
                      >
                        <Eye size={12} />
                        <span>Detail</span>
                      </button>
                      <button
                        onClick={() => setPrintSklStudent(student)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold text-[11px] border border-amber-200 transition flex items-center gap-1"
                        title="Cetak Surat Keterangan Lulus"
                      >
                        <Printer size={12} />
                        <span>Cetak SKL</span>
                      </button>
                      <button
                        onClick={() => setEditingStudent({ ...student })}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] border border-blue-200 transition flex items-center gap-1"
                        title="Edit Data Alumni"
                      >
                        <Edit size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleReactivateStudent(student.id, student.name)}
                        className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg font-bold text-[11px] transition"
                        title="Batalkan Kelulusan (Kembalikan ke Aktif)"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmStudent(student)}
                        className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg font-bold text-[11px] transition"
                        title="Hapus Permanen Data Alumni"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Luluskan Siswa Manual */}
      {showGraduateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <GraduationCap className="text-indigo-600" size={18} />
                Luluskan Siswa Menjadi Alumni
              </h3>
              <button onClick={() => setShowGraduateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleGraduateStudent} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Siswa Aktif:</label>
                <select
                  value={selectedStudentToGraduate}
                  onChange={(e) => setSelectedStudentToGraduate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Pilih Siswa yang Lulus --</option>
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatClassLabel(s.class, true)}) - NISN: {s.nisn || '-'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-800 text-[11px] leading-relaxed border border-amber-200">
                Siswa yang diluluskan statusnya akan berubah menjadi <strong>Lulus</strong> dan tercatat resmi di Buku Induk Alumni.
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowGraduateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentToGraduate}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Status Lulus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Alumni */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="text-amber-600" size={18} />
                Biodata Lengkap Alumni
              </h3>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Nama Lengkap</span>
                <p className="font-bold text-slate-900">{selectedStudent.name}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">NISN / NIS</span>
                <p className="font-mono text-slate-800">{selectedStudent.nisn || '-'} / {selectedStudent.nis || '-'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tempat, Tgl Lahir</span>
                <p className="text-slate-800">{selectedStudent.pob || '-'}, {selectedStudent.dob || '-'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Jenis Kelamin</span>
                <p className="text-slate-800">{selectedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Nama Orang Tua</span>
                <p className="text-slate-800">{selectedStudent.parentName || selectedStudent.fatherName || '-'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Kontak / No WA</span>
                <p className="text-slate-800">{selectedStudent.phone || selectedStudent.parentPhone || '-'}</p>
              </div>
              <div className="col-span-2 p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Alamat Tempat Tinggal</span>
                <p className="text-slate-800">{selectedStudent.address || '-'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => {
                  const s = selectedStudent;
                  setSelectedStudent(null);
                  setPrintSklStudent(s);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak SKL</span>
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cetak Surat Keterangan Lulus (SKL) */}
      {printSklStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-6 my-6 text-slate-900">
            <div className="flex justify-between items-center border-b pb-3 no-print">
              <span className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full uppercase">
                Pratinjau Surat Keterangan Lulus (SKL)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  onClick={() => setPrintSklStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* SKL Printable Body */}
            <div id="printable-area" className="printable-container p-8 border rounded-2xl bg-white space-y-6 text-sm text-slate-800 font-serif leading-relaxed print:p-0 print:border-none print:m-0">
              {/* Kop Surat */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <h3 className="font-bold text-base tracking-wide uppercase text-slate-900">
                  {settings.schoolName || 'LEMBAGA PENDIDIKAN ROMBEL TAMBORA'}
                </h3>
                <p className="text-xs text-slate-600 font-sans">
                  {settings.schoolAddress || 'Jl. Tambora No. 12, Jakarta Barat - DKI Jakarta'} | Telp: {settings.schoolPhone || '(021) 567890'}
                </p>
                <p className="text-[11px] text-slate-500 font-sans">NPSN: {settings.schoolNpsn || '20109999'} | Email: info@sekolah.sch.id</p>
              </div>

              {/* Title Surat */}
              <div className="text-center space-y-1">
                <h4 className="font-black text-base underline uppercase tracking-wider">SURAT KETERANGAN LULUS</h4>
                <p className="text-xs font-sans text-slate-600">Nomor: 421.2/SKL/{printSklStudent.id?.slice(-4) || '001'}/{new Date().getFullYear()}</p>
              </div>

              {/* Body Paragraph */}
              <p className="text-xs leading-relaxed">
                Yang bertanda tangan di bawah ini, Kepala {settings.schoolName || 'Rombel Tambora'}, menerangkan bahwa:
              </p>

              {/* Table Data Siswa */}
              <div className="grid grid-cols-3 gap-y-2 text-xs font-sans bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-600">Nama Siswa</span>
                <span className="col-span-2 font-bold text-slate-900">: {printSklStudent.name}</span>

                <span className="font-semibold text-slate-600">NISN / NIS</span>
                <span className="col-span-2 font-mono text-slate-900">: {printSklStudent.nisn || '-'} / {printSklStudent.nis || '-'}</span>

                <span className="font-semibold text-slate-600">Tempat, Tanggal Lahir</span>
                <span className="col-span-2 text-slate-900">: {printSklStudent.pob || '-'}, {printSklStudent.dob || '-'}</span>

                <span className="font-semibold text-slate-600">Jenis Kelamin</span>
                <span className="col-span-2 text-slate-900">: {printSklStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>

                <span className="font-semibold text-slate-600">Nama Orang Tua / Wali</span>
                <span className="col-span-2 text-slate-900">: {printSklStudent.parentName || printSklStudent.fatherName || '-'}</span>

                <span className="font-semibold text-slate-600">Program / Rombel</span>
                <span className="col-span-2 text-slate-900">: {printSklStudent.class || 'Tingkat Akhir'}</span>
              </div>

              <p className="text-xs leading-relaxed text-justify">
                Berdasarkan kriteria kelulusan dan hasil rapat pleno dewan guru, yang bersangkutan dinyatakan:
              </p>

              <div className="p-3 text-center bg-emerald-50 border-2 border-emerald-600 rounded-xl text-emerald-950 font-black text-sm uppercase tracking-widest font-sans">
                *** L U L U S ***
              </div>

              <p className="text-xs leading-relaxed text-justify">
                Surat keterangan ini diberikan sebagai bukti kelulusan sementara sebelum diterbitkannya Ijazah resmi dari Kementerian Pendidikan.
              </p>

              {/* Tanda Tangan */}
              <div className="pt-6 flex justify-end text-xs font-sans">
                <div className="text-center space-y-12">
                  <div>
                    <p>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold">Pimpinan,</p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase">{settings.schoolPrincipal || '( ............................................ )'}</p>
                    <p className="text-[10px] text-slate-500">NIP. {settings.schoolPrincipalNip || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Edit Data Alumni */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit className="text-blue-600" size={18} />
                Edit Data Alumni
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Alumni:</label>
                  <input
                    type="text"
                    value={editingStudent.name || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NISN:</label>
                  <input
                    type="text"
                    value={editingStudent.nisn || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nisn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NIS:</label>
                  <input
                    type="text"
                    value={editingStudent.nis || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nis: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Kelamin:</label>
                  <select
                    value={editingStudent.gender || 'L'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as 'L' | 'P' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kelas Terakhir:</label>
                  <input
                    type="text"
                    value={editingStudent.class || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, class: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tempat Lahir:</label>
                  <input
                    type="text"
                    value={editingStudent.pob || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, pob: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Lahir:</label>
                  <input
                    type="date"
                    value={editingStudent.dob || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nama Orang Tua / Wali:</label>
                  <input
                    type="text"
                    value={editingStudent.parentName || editingStudent.fatherName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value, fatherName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">No. HP / WA:</label>
                  <input
                    type="text"
                    value={editingStudent.phone || editingStudent.parentPhone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value, parentPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Alamat:</label>
                  <textarea
                    rows={2}
                    value={editingStudent.address || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Save size={14} />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hapus Permanen Alumni */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Data Alumni</h3>
                <p className="text-xs text-slate-500">Tindakan ini permanen.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Yakin ingin menghapus data alumni <strong>{deleteConfirmStudent.name}</strong> (NISN: {deleteConfirmStudent.nisn || '-'})?
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setDeleteConfirmStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteAlumni(deleteConfirmStudent)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 size={14} />
                <span>Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

