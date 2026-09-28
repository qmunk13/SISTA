import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { formatClassLabel, triggerPrint } from '../lib/utils';
import { fetchFromGAS } from '../lib/api';
import { DEFAULT_APP_CONFIG } from '../data/config';
import { 
  Search, RotateCcw, X, AlertCircle, Printer, Download, Plus, 
  Eye, CheckCircle2, FileText, ArrowRightCircle, Edit, Trash2, Save, AlertTriangle
} from 'lucide-react';
import { exportToExcel } from '../lib/excel';

export default function MutasiList() {
  const { students, updateStudent, deleteStudent, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);
  const [printMutasiStudent, setPrintMutasiStudent] = useState<Student | null>(null);
  const [showMutasiModal, setShowMutasiModal] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  const gasUrl = settings.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl;
  const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;

  // Form for Mutasi Baru
  const [targetStudentId, setTargetStudentId] = useState('');
  const [mutasiType, setMutasiType] = useState<'Pindah' | 'Keluar'>('Pindah');
  const [sekolahTujuan, setSekolahTujuan] = useState('');
  const [alasanMutasi, setAlasanMutasi] = useState('');

  const mutasiList = useMemo(() => {
    return students.filter(s => s && (s.status === 'Pindah' || s.status === 'Keluar'));
  }, [students]);

  const activeStudents = useMemo(() => {
    return students.filter(s => s && s.status !== 'Pindah' && s.status !== 'Keluar' && s.status !== 'Lulus');
  }, [students]);

  const filteredMutasi = useMemo(() => {
    if (!searchTerm) return mutasiList;
    const term = searchTerm.toLowerCase();
    return mutasiList.filter(s => 
      s.name.toLowerCase().includes(term) ||
      (s.nisn && s.nisn.includes(term)) ||
      (s.nis && s.nis.includes(term)) ||
      (s.class && s.class.toLowerCase().includes(term))
    );
  }, [mutasiList, searchTerm]);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 4000);
  };

  const handleReactivate = (id: string, name: string) => {
    if (window.confirm(`Batalkan mutasi dan pulihkan status ${name} menjadi siswa Aktif?`)) {
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
      showNotification(`Siswa ${name} berhasil dipulihkan menjadi Siswa Aktif.`);
    }
  };

  const handleCreateMutasi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId) return;
    const student = students.find(s => s.id === targetStudentId);
    if (student) {
      const mutasiUpdate: Partial<Student> = { 
        status: mutasiType,
        notes: `Mutasi: ${mutasiType}. Tujuan: ${sekolahTujuan || '-'}. Alasan: ${alasanMutasi || '-'}`
      };
      updateStudent(student.id, mutasiUpdate);
      const currentList = useStore.getState().students;
      const nextList = currentList.map(s => s.id === student.id ? { ...s, ...mutasiUpdate, updatedAt: new Date().toISOString() } : s);
      if (gasUrl) {
        fetchFromGAS(gasUrl, {
          action: 'sync',
          data: nextList,
          teachers: useStore.getState().teachers,
          spreadsheetId: spreadsheetId
        }).catch(err => console.warn("Sync error:", err));
      }
      showNotification(`Siswa ${student.name} berhasil dimutasikan (Status: ${mutasiType}).`);
      setTargetStudentId('');
      setSekolahTujuan('');
      setAlasanMutasi('');
      setShowMutasiModal(false);
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
    showNotification(`Data mutasi siswa ${editingStudent.name} berhasil diperbarui.`);
    setEditingStudent(null);
  };

  const handleDeleteMutasi = (student: Student) => {
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
    showNotification(`Data siswa mutasi ${student.name} berhasil dihapus.`);
    setDeleteConfirmStudent(null);
  };

  const handleExportMutasi = () => {
    if (filteredMutasi.length === 0) {
      alert("Tidak ada data mutasi untuk diekspor.");
      return;
    }
    const dataToExport = filteredMutasi.map((s, idx) => ({
      No: idx + 1,
      "Nama Siswa": s.name,
      NISN: s.nisn || '-',
      NIS: s.nis || '-',
      "Jenis Kelamin": s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      "Kelas Terakhir": s.class || '-',
      "Tempat Lahir": s.pob || '-',
      "Tanggal Lahir": s.dob || '-',
      "Nama Orang Tua": s.parentName || s.fatherName || '-',
      "No HP/WA": s.phone || s.parentPhone || '-',
      "Alamat": s.address || '-',
      "Status Mutasi": s.status,
      "Keterangan": s.notes || '-'
    }));
    exportToExcel(dataToExport, `Data_Mutasi_Siswa_${new Date().getFullYear()}.xlsx`);
    showNotification("Data Mutasi berhasil diekspor ke Excel!");
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
            <RotateCcw className="text-rose-500" size={20} />
            Data Mutasi & Siswa Keluar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Daftar siswa yang berpindah atau keluar (Status: Pindah / Keluar / DO).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleExportMutasi}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition active:scale-95"
            title="Ekspor ke Excel"
          >
            <Download size={14} />
            <span>Ekspor Excel</span>
          </button>
          <button 
            onClick={() => setShowMutasiModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Plus size={14} />
            <span>Mutasikan Siswa</span>
          </button>
          <span className="text-xs font-bold bg-rose-50 text-rose-700 px-3 py-2 rounded-xl border border-rose-200/60">
            Total Mutasi: {mutasiList.length} Siswa
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa mutasi, NISN, atau kelas..."
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

      {filteredMutasi.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <AlertCircle size={40} className="mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-600 text-sm">Belum Ada Data Mutasi / Siswa Keluar</p>
          <p className="text-xs text-slate-400 mt-1">Siswa dengan status Pindah atau Keluar akan otomatis terdaftar di sini.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-4">No</th>
                <th className="p-3.5">Nama Siswa</th>
                <th className="p-3.5">NISN / NIS</th>
                <th className="p-3.5">L/P</th>
                <th className="p-3.5">Kelas Terakhir</th>
                <th className="p-3.5">Status Mutasi</th>
                <th className="p-3.5 text-center">Aksi & Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredMutasi.map((student, idx) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 pl-4 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-900">{student.name}</td>
                  <td className="p-3.5 text-slate-500 font-mono">{student.nisn || '-'} / {student.nis || '-'}</td>
                  <td className="p-3.5 font-semibold">{student.gender}</td>
                  <td className="p-3.5"><span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">{formatClassLabel(student.class, true)}</span></td>
                  <td className="p-3.5"><span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">{student.status}</span></td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        title="Lihat Detail Siswa"
                      >
                        <Eye size={12} />
                        <span>Detail</span>
                      </button>
                      <button
                        onClick={() => setPrintMutasiStudent(student)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg font-bold text-[11px] border border-rose-200 transition flex items-center gap-1"
                        title="Cetak Surat Keterangan Pindah"
                      >
                        <Printer size={12} />
                        <span>Cetak Surat Pindah</span>
                      </button>
                      <button
                        onClick={() => setEditingStudent({ ...student })}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] border border-blue-200 transition flex items-center gap-1"
                        title="Edit Keterangan Mutasi"
                      >
                        <Edit size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleReactivate(student.id, student.name)}
                        className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg font-bold text-[11px] transition"
                        title="Batalkan Mutasi (Pulihkan Siswa Menjadi Aktif)"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmStudent(student)}
                        className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg font-bold text-[11px] transition"
                        title="Hapus Permanen Data Siswa Mutasi"
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

      {/* Modal: Mutasikan Siswa Manual */}
      {showMutasiModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ArrowRightCircle className="text-rose-600" size={18} />
                Mutasikan Siswa (Pindah / Keluar)
              </h3>
              <button onClick={() => setShowMutasiModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateMutasi} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Siswa Aktif:</label>
                <select
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="">-- Pilih Siswa yang Akan Dimutasi --</option>
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatClassLabel(s.class, true)}) - NISN: {s.nisn || '-'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Mutasi:</label>
                  <select
                    value={mutasiType}
                    onChange={(e) => setMutasiType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="Pindah">Pindah</option>
                    <option value="Keluar">Keluar / Putus</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tujuan:</label>
                  <input
                    type="text"
                    placeholder="Contoh: SMP Negeri 1 Jakarta"
                    value={sekolahTujuan}
                    onChange={(e) => setSekolahTujuan(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alasan Kepindahan / Catatan:</label>
                <textarea
                  rows={2}
                  placeholder="Mengikuti tugas orang tua / domisili baru..."
                  value={alasanMutasi}
                  onChange={(e) => setAlasanMutasi(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowMutasiModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!targetStudentId}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Siswa */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RotateCcw className="text-rose-600" size={18} />
                Biodata Siswa Mutasi
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
                <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                <p className="font-bold text-rose-600">{selectedStudent.status}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Kelas Terakhir</span>
                <p className="text-slate-800">{selectedStudent.class || '-'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Nama Orang Tua</span>
                <p className="text-slate-800">{selectedStudent.parentName || selectedStudent.fatherName || '-'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Kontak HP/WA</span>
                <p className="text-slate-800">{selectedStudent.phone || selectedStudent.parentPhone || '-'}</p>
              </div>
              <div className="col-span-2 p-3 bg-slate-50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Alamat Siswa</span>
                <p className="text-slate-800">{selectedStudent.address || '-'}</p>
              </div>
              {selectedStudent.notes && (
                <div className="col-span-2 p-3 bg-rose-50 rounded-xl space-y-0.5 border border-rose-200 text-rose-900">
                  <span className="text-[10px] text-rose-600 font-bold uppercase">Catatan Mutasi</span>
                  <p>{selectedStudent.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => {
                  const s = selectedStudent;
                  setSelectedStudent(null);
                  setPrintMutasiStudent(s);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak Surat Pindah</span>
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

      {/* Modal: Cetak Surat Keterangan Pindah Sekolah */}
      {printMutasiStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-6 my-6 text-slate-900">
            <div className="flex justify-between items-center border-b pb-3 no-print">
              <span className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full uppercase">
                Pratinjau Surat Keterangan Pindah Sekolah
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Surat</span>
                </button>
                <button
                  onClick={() => setPrintMutasiStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Surat Printable Body */}
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
                <h4 className="font-black text-base underline uppercase tracking-wider">SURAT KETERANGAN PINDAH</h4>
                <p className="text-xs font-sans text-slate-600">Nomor: 421.1/SKP/{printMutasiStudent.id?.slice(-4) || '001'}/{new Date().getFullYear()}</p>
              </div>

              {/* Body Paragraph */}
              <p className="text-xs leading-relaxed">
                Yang bertanda tangan di bawah ini, Pimpinan {settings.schoolName || 'Rombel Tambora'}, menerangkan bahwa:
              </p>

              {/* Table Data Siswa */}
              <div className="grid grid-cols-3 gap-y-2 text-xs font-sans bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-600">Nama Siswa</span>
                <span className="col-span-2 font-bold text-slate-900">: {printMutasiStudent.name}</span>

                <span className="font-semibold text-slate-600">NISN / NIS</span>
                <span className="col-span-2 font-mono text-slate-900">: {printMutasiStudent.nisn || '-'} / {printMutasiStudent.nis || '-'}</span>

                <span className="font-semibold text-slate-600">Tempat, Tanggal Lahir</span>
                <span className="col-span-2 text-slate-900">: {printMutasiStudent.pob || '-'}, {printMutasiStudent.dob || '-'}</span>

                <span className="font-semibold text-slate-600">Jenis Kelamin</span>
                <span className="col-span-2 text-slate-900">: {printMutasiStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>

                <span className="font-semibold text-slate-600">Kelas Terakhir</span>
                <span className="col-span-2 text-slate-900">: {printMutasiStudent.class || '-'}</span>

                <span className="font-semibold text-slate-600">Nama Orang Tua / Wali</span>
                <span className="col-span-2 text-slate-900">: {printMutasiStudent.parentName || printMutasiStudent.fatherName || '-'}</span>
              </div>

              <p className="text-xs leading-relaxed text-justify">
                Telah mengajukan surat permohonan pindah dan resmi dinyatakan pindah / keluar dari lembaga kami terhitung sejak tanggal diterbitkannya surat ini.
              </p>

              <p className="text-xs leading-relaxed text-justify">
                Demikian surat keterangan pindah ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya di tempat tujuan.
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
      {/* Modal: Edit Data Mutasi */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit className="text-blue-600" size={18} />
                Edit Data & Keterangan Mutasi
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nama Siswa:</label>
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
                  <label className="font-bold text-slate-700 block mb-1">Jenis Mutasi:</label>
                  <select
                    value={editingStudent.status || 'Pindah'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Pindah">Pindah Sekolah</option>
                    <option value="Keluar">Keluar / Drop Out</option>
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
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Alasan Mutasi & Sekolah Tujuan / Catatan:</label>
                  <textarea
                    rows={3}
                    value={editingStudent.notes || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, notes: e.target.value })}
                    placeholder="Contoh: Pindah ke SMP Negeri 1 Jakarta karena mengikuti orang tua."
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

      {/* Modal: Hapus Permanen Mutasi */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Data Siswa Mutasi</h3>
                <p className="text-xs text-slate-500">Tindakan ini permanen.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Yakin ingin menghapus data siswa mutasi <strong>{deleteConfirmStudent.name}</strong> (NISN: {deleteConfirmStudent.nisn || '-'})?
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setDeleteConfirmStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteMutasi(deleteConfirmStudent)}
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

