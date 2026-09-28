import React, { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { 
  FileText, CheckCircle2, XCircle, Clock, AlertTriangle, 
  Search, Filter, Plus, Calendar, User, Phone, Eye, 
  Check, X, Trash2, Camera, Upload, ExternalLink, Image as ImageIcon,
  ChevronRight, RefreshCw, ShieldCheck, Sparkles, AlertCircle, HelpCircle,
  Printer
} from 'lucide-react';
import { 
  StudentPermission, PermissionType, PermissionStatus,
  getPermissions, approvePermission, rejectPermission, deletePermission, 
  addPermission, compressImageFile, getDatesInRange 
} from '../../lib/permissionService';
import { normalizeClassName, getActiveClasses, formatClassLabel, matchStatusActive, sortStudentsByStatusAndName, triggerPrint } from '../../lib/utils';
import CustomDropdown from '../common/CustomDropdown';

export default function PerizinanSiswaTab() {
  const { students, teachers, settings } = useStore();
  const activeStudents = useMemo(() => {
    return sortStudentsByStatusAndName(students.filter(s => matchStatusActive(s?.status)));
  }, [students]);
  const [permissions, setPermissions] = useState<StudentPermission[]>(() => getPermissions());

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | PermissionStatus>('Semua');
  const [filterType, setFilterType] = useState<'Semua' | PermissionType>('Semua');
  const [filterClass, setFilterClass] = useState<string>('Semua');

  // Modals
  const [selectedProofModal, setSelectedProofModal] = useState<StudentPermission | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<StudentPermission | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [rejectModalItem, setRejectModalItem] = useState<StudentPermission | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Add Manual Form State
  const [formClassFilter, setFormClassFilter] = useState<string>('Semua');
  const [formStudentSearch, setFormStudentSearch] = useState<string>('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formType, setFormType] = useState<PermissionType>('Sakit');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [formReason, setFormReason] = useState('');
  const [formProofBase64, setFormProofBase64] = useState<string>('');
  const [formApplicantName, setFormApplicantName] = useState('Wali Kelas / Guru');
  const [formApplicantPhone, setFormApplicantPhone] = useState('');
  const [formAutoApprove, setFormAutoApprove] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const activeClasses = useMemo(() => getActiveClasses(students), [students]);

  // Form Filtered Students by Class & Search
  const filteredFormStudents = useMemo(() => {
    return activeStudents.filter(s => {
      const matchCls = formClassFilter === 'Semua' || normalizeClassName(s.class) === normalizeClassName(formClassFilter);
      const matchSearch = !formStudentSearch || 
        s.name.toLowerCase().includes(formStudentSearch.toLowerCase()) || 
        (s.nisn && s.nisn.includes(formStudentSearch)) ||
        (s.nis && s.nis.includes(formStudentSearch));
      return matchCls && matchSearch;
    });
  }, [activeStudents, formClassFilter, formStudentSearch]);

  // Filtered List
  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => {
      // Search
      const matchSearch = 
        !searchQuery ||
        p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nisn && p.nisn.includes(searchQuery)) ||
        p.reason.toLowerCase().includes(searchQuery.toLowerCase());

      // Status
      const matchStatus = filterStatus === 'Semua' || p.status === filterStatus;

      // Type
      const matchType = filterType === 'Semua' || p.type === filterType;

      // Class
      const matchClass = filterClass === 'Semua' || normalizeClassName(p.studentClass) === normalizeClassName(filterClass);

      return matchSearch && matchStatus && matchType && matchClass;
    });
  }, [permissions, searchQuery, filterStatus, filterType, filterClass]);

  // Metrics
  const stats = useMemo(() => {
    const total = permissions.length;
    const pending = permissions.filter(p => p.status === 'Menunggu').length;
    const approved = permissions.filter(p => p.status === 'Disetujui').length;
    const rejected = permissions.filter(p => p.status === 'Ditolak').length;
    const sakit = permissions.filter(p => p.type === 'Sakit').length;
    const izin = permissions.filter(p => p.type === 'Izin' || p.type === 'Dispensasi').length;
    return { total, pending, approved, rejected, sakit, izin };
  }, [permissions]);

  // Handle Approve
  const handleApprove = (item: StudentPermission) => {
    const updated = approvePermission(item.id, 'Wali Kelas / Petugas Piket', 'Disetujui secara resmi.');
    setPermissions(updated);
  };

  // Handle Open Reject
  const handleOpenReject = (item: StudentPermission) => {
    setRejectModalItem(item);
    setRejectReason('');
  };

  // Handle Submit Reject
  const handleConfirmReject = () => {
    if (!rejectModalItem) return;
    const updated = rejectPermission(rejectModalItem.id, 'Wali Kelas / Petugas Piket', rejectReason || 'Bukti foto tidak valid / tidak sesuai ketentuan');
    setPermissions(updated);
    setRejectModalItem(null);
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    if (window.confirm('Hapus arsip pengajuan izin ini? Log presensi otomatis terkait juga akan dibersihkan.')) {
      const updated = deletePermission(id);
      setPermissions(updated);
    }
  };

  // Handle File/Camera upload in Form
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const compressed = await compressImageFile(file, 1200, 0.75);
      setFormProofBase64(compressed);
    } catch (err) {
      alert('Gagal memproses gambar foto. Silakan coba lagi.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Save Manual Permission
  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId) {
      alert('Pilih siswa terlebih dahulu.');
      return;
    }
    const student = students.find(s => s.id === formStudentId);
    if (!student) return;

    if (!formReason.trim()) {
      alert('Isi alasan perizinan.');
      return;
    }

    const dates = getDatesInRange(formStartDate, formEndDate);
    const newPerm = addPermission({
      studentId: student.id,
      studentName: student.name,
      studentClass: student.class,
      nisn: student.nisn || '',
      type: formType,
      startDate: formStartDate,
      endDate: formEndDate,
      daysCount: dates.length,
      reason: formReason.trim(),
      proofImageUrl: formProofBase64,
      submittedBy: 'Guru / Wali Kelas',
      applicantName: formApplicantName,
      applicantPhone: formApplicantPhone,
    });

    if (formAutoApprove) {
      const updated = approvePermission(newPerm.id, 'Wali Kelas / Guru Piket', 'Diinput & disetujui langsung oleh guru.');
      setPermissions(updated);
    } else {
      setPermissions(getPermissions());
    }

    // Reset & close
    setIsAddModalOpen(false);
    setFormReason('');
    setFormProofBase64('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-rose-100">
              <ShieldCheck size={14} className="text-rose-200" />
              <span>Sistem E-Izin & Surat Sakit Digital</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              Verifikasi Izin & Surat Sakit Siswa
            </h2>
            <p className="text-xs text-rose-100 max-w-2xl leading-relaxed">
              Pusat monitoring dan persetujuan surat izin, surat dokter, dan dispensasi siswa. Izin yang disetujui <strong>otomatis tersinkronisasi ke presensi (S/I)</strong> dan ledger rapor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFormStudentId(students[0]?.id || '');
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>+ Input Izin / Sakit Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">Total Pengajuan</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sakit: {stats.sakit} | Izin: {stats.izin}</div>
        </div>

        <div className="bg-amber-50/80 p-4 rounded-3xl border border-amber-200/80 shadow-xs relative overflow-hidden">
          {stats.pending > 0 && (
            <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          )}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-800">Menunggu Verifikasi</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">{stats.pending}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Perlu tindakan wali kelas</div>
        </div>

        <div className="bg-emerald-50/80 p-4 rounded-3xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-800">Disetujui (Tersinkron)</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900">{stats.approved}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Otomatis masuk ke presensi</div>
        </div>

        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">Ditolak</span>
            <XCircle size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800">{stats.rejected}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bukti tidak valid / fiktif</div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama siswa, NISN, atau alasan izin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <CustomDropdown
              id="perizinan-filter-status"
              value={filterStatus}
              onChange={(val) => setFilterStatus(val as any)}
              options={[
                { value: 'Semua', label: 'Semua Status' },
                { value: 'Menunggu', label: '⏳ Menunggu Verifikasi' },
                { value: 'Disetujui', label: '✅ Disetujui' },
                { value: 'Ditolak', label: '❌ Ditolak' }
              ]}
              placeholder="Status..."
              className="min-w-[140px]"
            />

            {/* Type Filter */}
            <CustomDropdown
              id="perizinan-filter-type"
              value={filterType}
              onChange={(val) => setFilterType(val as any)}
              options={[
                { value: 'Semua', label: 'Semua Jenis' },
                { value: 'Sakit', label: '🩺 Sakit' },
                { value: 'Izin', label: '📝 Izin Keperluan' },
                { value: 'Dispensasi', label: '🏆 Dispensasi' }
              ]}
              placeholder="Jenis..."
              className="min-w-[130px]"
            />

            {/* Class Filter */}
            <CustomDropdown
              id="perizinan-filter-class"
              value={filterClass}
              onChange={(val) => setFilterClass(val)}
              options={[
                { value: 'Semua', label: 'Semua Kelas' },
                ...activeClasses.map(c => ({
                  value: c,
                  label: formatClassLabel(c)
                }))
              ]}
              placeholder="Kelas..."
              className="min-w-[140px]"
              searchable={activeClasses.length > 5}
            />
          </div>
        </div>
      </div>

      {/* List Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Siswa & Kelas</th>
                <th className="py-3.5 px-4">Jenis & Durasi</th>
                <th className="py-3.5 px-4">Alasan & Pengaju</th>
                <th className="py-3.5 px-4 text-center">Bukti Foto</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPermissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText size={36} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="font-bold">Tidak ada data perizinan yang sesuai filter</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Siswa atau wali murid dapat mengajukan izin lewat Portal Siswa/Ortu</p>
                  </td>
                </tr>
              ) : (
                filteredPermissions.map((item) => {
                  const isSakit = item.type === 'Sakit';
                  const isIzin = item.type === 'Izin';
                  const isPending = item.status === 'Menunggu';
                  const isApproved = item.status === 'Disetujui';
                  const isRejected = item.status === 'Ditolak';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Siswa & Kelas */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{item.studentName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md">
                            {formatClassLabel(item.studentClass)}
                          </span>
                          {item.nisn && <span>• NISN: {item.nisn}</span>}
                        </div>
                      </td>

                      {/* Jenis & Durasi */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 ${
                            isSakit 
                              ? 'bg-rose-100 text-rose-700' 
                              : isIzin 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {isSakit ? '🩺 Sakit' : isIzin ? '📝 Izin' : '🏆 Dispensasi'}
                          </span>
                          <span className="font-bold text-slate-700">
                            {item.daysCount} Hari
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{item.startDate} {item.startDate !== item.endDate && `s/d ${item.endDate}`}</span>
                        </div>
                      </td>

                      {/* Alasan & Pengaju */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-slate-800 font-medium line-clamp-2 leading-relaxed" title={item.reason}>
                          "{item.reason}"
                        </p>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>Oleh: <strong>{item.submittedBy}</strong> {item.applicantName ? `(${item.applicantName})` : ''}</span>
                          {item.applicantPhone && (
                            <a 
                              href={`https://wa.me/${item.applicantPhone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                            >
                              <Phone size={10} /> WA
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Bukti Foto */}
                      <td className="py-4 px-4 text-center">
                        {item.proofImageUrl ? (
                          <button
                            onClick={() => setSelectedProofModal(item)}
                            className="group relative inline-block rounded-xl overflow-hidden border border-slate-200 shadow-xs hover:ring-2 hover:ring-rose-500 transition"
                          >
                            <img 
                              src={item.proofImageUrl} 
                              alt="Bukti Izin" 
                              className="w-12 h-12 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={14} />
                            </div>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic bg-slate-100 px-2.5 py-1 rounded-lg">
                            Tanpa Foto
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {isPending && (
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                            <Clock size={12} /> Menunggu
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> Disetujui
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                            <XCircle size={12} /> Ditolak
                          </span>
                        )}
                      </td>

                      {/* Aksi Verifikasi */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Lihat Detail Selalu Tersedia */}
                          <button
                            onClick={() => setDetailModalItem(item)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs inline-flex items-center gap-1 transition shadow-2xs"
                            title="Lihat rincian lengkap perizinan"
                          >
                            <Eye size={13} />
                            <span>Lihat</span>
                          </button>

                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApprove(item)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs inline-flex items-center gap-1 shadow-xs transition active:scale-95"
                                title="Setujui dan sinkronkan ke presensi"
                              >
                                <Check size={14} /> Setujui
                              </button>
                              <button
                                onClick={() => handleOpenReject(item)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs inline-flex items-center gap-1 transition"
                                title="Tolak perizinan"
                              >
                                <X size={14} /> Tolak
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              {isRejected && (
                                <button
                                  onClick={() => handleApprove(item)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition"
                                >
                                  Setujui
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus arsip"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Lightbox Bukti Foto & Detail */}
      {selectedProofModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Bukti Foto Surat {selectedProofModal.type} Siswa
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedProofModal.studentName} ({formatClassLabel(selectedProofModal.studentClass)})
                </p>
              </div>
              <button
                onClick={() => setSelectedProofModal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 space-y-4">
              {/* Image Preview */}
              <div className="bg-slate-950 rounded-2xl p-2 flex items-center justify-center max-h-[420px] overflow-hidden">
                <img 
                  src={selectedProofModal.proofImageUrl} 
                  alt="Bukti Foto Lengkap" 
                  className="max-h-[400px] w-auto object-contain rounded-xl"
                />
              </div>

              {/* Info Details */}
              <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2 border border-slate-200/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Rentang Tanggal:</span>
                  <span className="font-bold text-slate-800">{selectedProofModal.startDate} s/d {selectedProofModal.endDate} ({selectedProofModal.daysCount} Hari)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Alasan:</span>
                  <span className="font-bold text-slate-900 text-right max-w-xs">{selectedProofModal.reason}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Diajukan Oleh:</span>
                  <span className="font-bold text-slate-800">{selectedProofModal.submittedBy} {selectedProofModal.applicantName ? `- ${selectedProofModal.applicantName}` : ''}</span>
                </div>
                {selectedProofModal.reviewNotes && (
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-rose-700">
                    <span className="font-medium">Catatan Verifikasi:</span>
                    <span className="font-bold">{selectedProofModal.reviewNotes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              {selectedProofModal.status === 'Menunggu' && (
                <>
                  <button
                    onClick={() => {
                      handleApprove(selectedProofModal);
                      setSelectedProofModal(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition"
                  >
                    Setujui Sekarang
                  </button>
                  <button
                    onClick={() => {
                      const item = selectedProofModal;
                      setSelectedProofModal(null);
                      handleOpenReject(item);
                    }}
                    className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition"
                  >
                    Tolak Izin
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedProofModal(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Input Izin Manual Guru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <form onSubmit={handleSubmitManual} className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Input Izin / Sakit Manual</h3>
                    <p className="text-[11px] text-slate-500">Pencatatan surat dokter atau izin lewat WA/telepon</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-3 text-xs">
                {/* Filter Kelas & Pencarian Siswa */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <CustomDropdown
                        id="form-class-filter-select"
                        label="Filter Kelas"
                        value={formClassFilter}
                        onChange={(val) => {
                          setFormClassFilter(val);
                          setFormStudentId('');
                        }}
                        options={[
                          { value: 'Semua', label: `Semua Kelas (${activeStudents.length} Siswa)` },
                          ...activeClasses.map(c => ({
                            value: c,
                            label: `Kelas ${formatClassLabel(c, true)}`
                          }))
                        ]}
                        placeholder="Semua Kelas"
                        searchable={activeClasses.length > 5}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Cari Nama / NISN:</label>
                      <input
                        type="text"
                        placeholder="Ketik nama atau NISN..."
                        value={formStudentSearch}
                        onChange={(e) => setFormStudentSearch(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  </div>

                  {/* Pilih Siswa */}
                  <div>
                    <CustomDropdown
                      id="form-student-select"
                      label={`Pilih Siswa * (${filteredFormStudents.length} siswa)`}
                      value={formStudentId}
                      onChange={(val) => setFormStudentId(val)}
                      options={filteredFormStudents.map(s => ({
                        value: s.id,
                        label: `${s.name} - Kelas ${formatClassLabel(s.class, true)} ${s.nisn ? `(NISN: ${s.nisn})` : ''}`
                      }))}
                      placeholder={`-- Pilih Siswa (${filteredFormStudents.length}) --`}
                      searchable={true}
                    />
                  </div>
                </div>

                {/* Jenis Izin */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Perizinan *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Sakit', 'Izin', 'Dispensasi'] as PermissionType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormType(t)}
                        className={`py-2 rounded-xl font-black text-xs border transition ${
                          formType === t 
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t === 'Sakit' ? '🩺 Sakit' : t === 'Izin' ? '📝 Izin' : '🏆 Dispensasi'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Dari Tanggal *</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => {
                        setFormStartDate(e.target.value);
                        if (e.target.value > formEndDate) setFormEndDate(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Sampai Tanggal *</label>
                    <input
                      type="date"
                      value={formEndDate}
                      min={formStartDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* Alasan */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Keterangan / Alasan Lengkap *</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Sakit demam tinggi, surat dokter klinik terlampir."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    required
                  />
                </div>

                {/* Upload Foto Bukti */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Foto Bukti / Surat Dokter (Opsional)</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition">
                      <Camera size={14} />
                      <span>{formProofBase64 ? 'Ganti Foto' : 'Ambil / Upload Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {isUploading && <span className="text-[11px] text-slate-400">Memproses foto...</span>}
                    {formProofBase64 && (
                      <div className="relative">
                        <img 
                          src={formProofBase64} 
                          alt="Thumbnail" 
                          className="w-10 h-10 object-cover rounded-lg border border-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => setFormProofBase64('')}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 text-[9px]"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto Approve Checkbox */}
                <label className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAutoApprove}
                    onChange={(e) => setFormAutoApprove(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-left">
                    <div className="font-bold text-emerald-900 text-xs">Langsung Setujui & Sinkron ke Presensi</div>
                    <div className="text-[10px] text-emerald-700">Otomatis mencatat status "{formType === 'Sakit' ? 'S' : 'I'}" pada tanggal terpilih</div>
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95"
                >
                  Simpan Perizinan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detail Rincian & Aksi Perizinan Siswa */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl space-y-4">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl ${
                  detailModalItem.type === 'Sakit' ? 'bg-rose-100 text-rose-700' :
                  detailModalItem.type === 'Izin' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Rincian Perizinan: {detailModalItem.studentName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kelas {formatClassLabel(detailModalItem.studentClass, true)} {detailModalItem.nisn ? `• NISN: ${detailModalItem.nisn}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 space-y-4 text-xs">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Status Saat Ini</span>
                  <span className={`font-black text-sm ${
                    detailModalItem.status === 'Disetujui' ? 'text-emerald-700' :
                    detailModalItem.status === 'Ditolak' ? 'text-rose-700' : 'text-amber-700'
                  }`}>
                    {detailModalItem.status === 'Disetujui' ? '✅ Disetujui' :
                     detailModalItem.status === 'Ditolak' ? '❌ Ditolak' : '⏳ Menunggu Verifikasi'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Jenis</span>
                  <span className="font-extrabold text-slate-800">
                    {detailModalItem.type} ({detailModalItem.daysCount} Hari)
                  </span>
                </div>
              </div>

              {/* Detail Data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-bold block text-[10px]">TANGGAL MULAI</span>
                  <span className="font-extrabold text-slate-800 text-sm">{detailModalItem.startDate}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-bold block text-[10px]">TANGGAL SELESAI</span>
                  <span className="font-extrabold text-slate-800 text-sm">{detailModalItem.endDate}</span>
                </div>
              </div>

              {/* Alasan */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase mb-1">Keterangan / Alasan</span>
                <p className="font-semibold text-slate-800 leading-relaxed text-xs">
                  {detailModalItem.reason}
                </p>
              </div>

              {/* Info Pengaju & Kontak */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Diajukan Oleh:</span>
                  <span className="font-bold text-slate-800">{detailModalItem.submittedBy} {detailModalItem.applicantName ? `(${detailModalItem.applicantName})` : ''}</span>
                </div>
                {detailModalItem.applicantPhone && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Kontak Pengaju:</span>
                    <a
                      href={`https://wa.me/${detailModalItem.applicantPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Phone size={12} /> {detailModalItem.applicantPhone} (Buka WhatsApp)
                    </a>
                  </div>
                )}
                {detailModalItem.reviewedBy && (
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Diverifikasi Oleh:</span>
                    <span className="font-bold text-slate-800">{detailModalItem.reviewedBy}</span>
                  </div>
                )}
                {detailModalItem.reviewNotes && (
                  <div className="flex justify-between text-rose-700">
                    <span className="font-medium">Catatan:</span>
                    <span className="font-bold">{detailModalItem.reviewNotes}</span>
                  </div>
                )}
              </div>

              {/* Foto Bukti jika ada */}
              {detailModalItem.proofImageUrl && (
                <div>
                  <span className="text-slate-500 font-bold block text-[11px] mb-1.5">Foto Bukti / Surat Dokter:</span>
                  <div className="bg-slate-900 rounded-2xl p-2 flex justify-center max-h-48 overflow-hidden">
                    <img
                      src={detailModalItem.proofImageUrl}
                      alt="Bukti Foto"
                      className="max-h-44 object-contain rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  const item = detailModalItem;
                  setDetailModalItem(null);
                  handleDelete(item.id);
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs inline-flex items-center gap-1 transition"
              >
                <Trash2 size={14} /> Hapus
              </button>

              <div className="flex items-center gap-2">
                {detailModalItem.status === 'Menunggu' && (
                  <>
                    <button
                      onClick={() => {
                        const item = detailModalItem;
                        setDetailModalItem(null);
                        handleApprove(item);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs inline-flex items-center gap-1 shadow-xs transition"
                    >
                      <Check size={14} /> Setujui
                    </button>
                    <button
                      onClick={() => {
                        const item = detailModalItem;
                        setDetailModalItem(null);
                        handleOpenReject(item);
                      }}
                      className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold text-xs inline-flex items-center gap-1 transition"
                    >
                      <X size={14} /> Tolak
                    </button>
                  </>
                )}
                {detailModalItem.status === 'Ditolak' && (
                  <button
                    onClick={() => {
                      const item = detailModalItem;
                      setDetailModalItem(null);
                      handleApprove(item);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs transition"
                  >
                    Ubah Jadi Setujui
                  </button>
                )}
                <button
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject Reason */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-2xl">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Tolak Pengajuan Izin</h3>
                <p className="text-xs text-slate-500">{rejectModalItem.studentName}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Alasan Penolakan (akan tampil ke siswa/ortu):</label>
              <textarea
                rows={3}
                placeholder="Contoh: Bukti surat dokter tidak jelas atau masa berlaku sudah lewat."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
