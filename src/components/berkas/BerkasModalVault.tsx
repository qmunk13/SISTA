import React, { useState, useRef } from 'react';
import { Student } from '../../types';
import { 
  STUDENT_DOC_CONFIGS, 
  DocItemConfig,
  getStudentCompleteness, 
  getStudentDocRequirement, 
  getStudentDocValue,
  isAyahDeceased,
  isIbuDeceased
} from '../../lib/berkasRules';
import { 
  cn, 
  formatClassLabel, 
  getGoogleDriveDirectImageUrl,
  triggerPrint
} from '../../lib/utils';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  CloudUpload, 
  Eye, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  FolderOpen, 
  FileText, 
  PlusCircle, 
  Printer, 
  ShieldCheck,
  Check,
  Search,
  Filter,
  Sparkles,
  Link,
  Layers
} from 'lucide-react';
import { fileToBase64, uploadFileToGAS, fetchFromGAS } from '../../lib/api';
import { useStore } from '../../store';

interface BerkasModalVaultProps {
  student: Student;
  onClose: () => void;
  onPreviewDoc: (preview: { title: string; url: string; studentName: string }) => void;
}

export default function BerkasModalVault({
  student,
  onClose,
  onPreviewDoc
}: BerkasModalVaultProps) {
  const { settings, updateStudent, setLoading, setIsSyncingGlobal, setLastSyncedAt } = useStore();
  const [activeTabCategory, setActiveTabCategory] = useState<string>('ALL');
  const [docSearchTerm, setDocSearchTerm] = useState('');
  
  // Custom Doc State
  const [isAddingCustomDoc, setIsAddingCustomDoc] = useState(false);
  const [customDocName, setCustomDocName] = useState('');
  const [customDocCategory, setCustomDocCategory] = useState('Berkas Tambahan');
  const [customDocUrl, setCustomDocUrl] = useState('');
  const [customDocMode, setCustomDocMode] = useState<'file' | 'link'>('file');
  const [isCustomDocUploading, setIsCustomDocUploading] = useState(false);
  const customDocFileInputRef = useRef<HTMLInputElement | null>(null);

  // Uploading state inside modal
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [manualUrlInput, setManualUrlInput] = useState<{ [docKey: string]: string }>({});
  const [activeUrlTab, setActiveUrlTab] = useState<{ [docKey: string]: 'file' | 'link' }>({});
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const stats = getStudentCompleteness(student);
  const customDocsList = Array.isArray(student.customDocs) ? student.customDocs : [];
  const photoUrl = getStudentDocValue(student, 'fotoUrl') || student.fotoUrl || student.pasFoto || (student as any).PasFoto || (student as any).foto;

  const ayahDead = isAyahDeceased(student);
  const ibuDead = isIbuDeceased(student);

  // Sync to GAS helper
  const triggerAutoSync = async (updatedStudent: Student) => {
    if (!settings.scriptUrl) return;
    try {
      setLoading(true);
      setIsSyncingGlobal(true);
      const allStudents = useStore.getState().students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: allStudents,
        teachers: useStore.getState().teachers,
        spreadsheetId: settings.spreadsheetId
      });
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      console.error("Sync document update failed:", e);
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  // Upload handler to Google Drive for Standard Docs
  const handleFileUpload = async (docConfig: DocItemConfig, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(String(docConfig.key));
      let fileUrl = '';

      if (settings.scriptUrl) {
        const nopdkt = (student.nis || (student as any).noPDKT || (student as any).nopdkt || student.id || '').toString().trim();
        const studentCleanName = (student.name || 'Siswa').trim();
        const studentFolderName = nopdkt ? `[${nopdkt}] ${studentCleanName}` : studentCleanName;
        const fileExt = file.name.includes('.') ? file.name.split('.').pop() : '';
        const customFilename = `${nopdkt ? '[' + nopdkt + ']_' : ''}${docConfig.shortLabel}_${studentCleanName.replace(/[^a-zA-Z0-9]/g, '_')}${fileExt ? '.' + fileExt : ''}`;

        try {
          const targetFolderId = settings.folderSiswaId || settings.folderId || 'BERKAS_SISWA_MASTER';
          const res = await uploadFileToGAS(
            settings.scriptUrl, 
            file, 
            targetFolderId, 
            customFilename,
            {
              studentId: student.id,
              nopdkt: nopdkt,
              studentName: student.name,
              studentClass: student.class,
              subFolder: studentFolderName,
              nisn: student.nisn,
              docKey: String(docConfig.key),
              modul: 'BERKAS_SISWA',
              kategori: docConfig.label,
              uploadedBy: 'Admin'
            }
          );
          fileUrl = res?.url || (typeof res === 'string' ? res : '');
        } catch (gasErr: any) {
          console.warn("GAS DriveApp upload fallback:", gasErr);
          fileUrl = await fileToBase64(file);
        }
      } else {
        fileUrl = await fileToBase64(file);
      }

      const updated = {
        ...student,
        [docConfig.key]: fileUrl,
        updatedAt: new Date().toISOString()
      };

      updateStudent(student.id, { [docConfig.key]: fileUrl, updatedAt: updated.updatedAt });
      await triggerAutoSync(updated);
    } catch (err: any) {
      alert("Gagal mengunggah berkas: " + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsUploading(null);
      if (e.target) e.target.value = '';
    }
  };

  // Save manual URL link
  const handleSaveManualUrl = async (docConfig: DocItemConfig) => {
    const url = manualUrlInput[String(docConfig.key)]?.trim();
    if (!url) return;

    const updated = {
      ...student,
      [docConfig.key]: url,
      updatedAt: new Date().toISOString()
    };

    updateStudent(student.id, { [docConfig.key]: url, updatedAt: updated.updatedAt });
    setManualUrlInput(prev => ({ ...prev, [String(docConfig.key)]: '' }));
    await triggerAutoSync(updated);
  };

  // Remove standard document
  const handleRemoveDoc = async (docConfig: DocItemConfig) => {
    if (!window.confirm(`Hapus berkas ${docConfig.label} untuk siswa ${student.name}?`)) return;

    const updated = {
      ...student,
      [docConfig.key]: '',
      updatedAt: new Date().toISOString()
    };

    updateStudent(student.id, { [docConfig.key]: '', updatedAt: updated.updatedAt });
    await triggerAutoSync(updated);
  };

  // Upload custom document
  const handleCustomDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const docTitle = customDocName.trim() || file.name.replace(/\.[^/.]+$/, "");

    try {
      setIsCustomDocUploading(true);
      let fileUrl = '';

      if (settings.scriptUrl) {
        const nopdkt = (student.nis || (student as any).noPDKT || student.id || '').toString().trim();
        const studentCleanName = (student.name || 'Siswa').trim();
        const studentFolderName = nopdkt ? `[${nopdkt}] ${studentCleanName}` : studentCleanName;
        const fileExt = file.name.includes('.') ? file.name.split('.').pop() : '';
        const customFilename = `${nopdkt ? '[' + nopdkt + ']_' : ''}BERKAS_LAIN_${docTitle.replace(/[^a-zA-Z0-9]/g, '_')}${fileExt ? '.' + fileExt : ''}`;

        try {
          const targetFolderId = settings.folderSiswaId || settings.folderId || 'BERKAS_SISWA_MASTER';
          const res = await uploadFileToGAS(
            settings.scriptUrl, 
            file, 
            targetFolderId, 
            customFilename,
            {
              studentId: student.id,
              nopdkt: nopdkt,
              studentName: student.name,
              studentClass: student.class,
              subFolder: studentFolderName,
              nisn: student.nisn,
              docKey: 'custom_doc',
              modul: 'BERKAS_SISWA',
              kategori: customDocCategory || 'Berkas Lainnya',
              uploadedBy: 'Admin'
            }
          );
          fileUrl = res?.url || (typeof res === 'string' ? res : '');
        } catch (err) {
          fileUrl = await fileToBase64(file);
        }
      } else {
        fileUrl = await fileToBase64(file);
      }

      const newCustomDoc = {
        id: `cd_${Date.now()}`,
        name: docTitle,
        url: fileUrl,
        uploadDate: new Date().toLocaleDateString('id-ID'),
        category: customDocCategory || 'Berkas Tambahan',
        fileType: file.type || 'application/pdf'
      };

      const existingCustomDocs = Array.isArray(student.customDocs) ? student.customDocs : [];
      const updatedDocs = [...existingCustomDocs, newCustomDoc];

      const updated = {
        ...student,
        customDocs: updatedDocs,
        updatedAt: new Date().toISOString()
      };

      updateStudent(student.id, { customDocs: updatedDocs, updatedAt: updated.updatedAt });
      setCustomDocName('');
      setCustomDocUrl('');
      setIsAddingCustomDoc(false);
      await triggerAutoSync(updated);
    } catch (err: any) {
      alert("Gagal menambahkan berkas: " + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsCustomDocUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Save custom doc link
  const handleSaveCustomDocLink = async () => {
    const docTitle = customDocName.trim();
    const url = customDocUrl.trim();

    if (!docTitle) {
      alert("Silakan masukkan nama berkas.");
      return;
    }
    if (!url) {
      alert("Silakan masukkan URL Google Drive.");
      return;
    }

    const newCustomDoc = {
      id: `cd_${Date.now()}`,
      name: docTitle,
      url: url,
      uploadDate: new Date().toLocaleDateString('id-ID'),
      category: customDocCategory || 'Berkas Tambahan',
      fileType: 'link'
    };

    const existingCustomDocs = Array.isArray(student.customDocs) ? student.customDocs : [];
    const updatedDocs = [...existingCustomDocs, newCustomDoc];

    const updated = {
      ...student,
      customDocs: updatedDocs,
      updatedAt: new Date().toISOString()
    };

    updateStudent(student.id, { customDocs: updatedDocs, updatedAt: updated.updatedAt });
    setCustomDocName('');
    setCustomDocUrl('');
    setIsAddingCustomDoc(false);
    await triggerAutoSync(updated);
  };

  // Delete custom doc
  const handleDeleteCustomDoc = async (docId: string, docName: string) => {
    if (!window.confirm(`Hapus berkas "${docName}"?`)) return;

    const existingCustomDocs = Array.isArray(student.customDocs) ? student.customDocs : [];
    const updatedDocs = existingCustomDocs.filter(d => d.id !== docId);

    const updated = {
      ...student,
      customDocs: updatedDocs,
      updatedAt: new Date().toISOString()
    };

    updateStudent(student.id, { customDocs: updatedDocs, updatedAt: updated.updatedAt });
    await triggerAutoSync(updated);
  };

  // Filter docs by category & search
  const filteredDocs = STUDENT_DOC_CONFIGS.filter(doc => {
    if (activeTabCategory !== 'ALL' && doc.category !== activeTabCategory) {
      return false;
    }
    if (docSearchTerm) {
      const q = docSearchTerm.toLowerCase();
      return doc.label.toLowerCase().includes(q) || doc.description.toLowerCase().includes(q);
    }
    return true;
  });

  const categories = [
    { id: 'ALL', label: 'Semua Berkas (16)' },
    { id: 'Identitas Pokok', label: 'Identitas Pokok & Siswa' },
    { id: 'Identitas Orang Tua', label: 'Identitas Orang Tua' },
    { id: 'Administrasi Pendaftaran', label: 'Form & Pernyataan' },
    { id: 'Riwayat Pendidikan', label: 'Ijazah & Rapor' },
    { id: 'Pendukung Tambahan', label: 'Pendukung & Lainnya' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 print-modal-container">
      <div id="printable-area" className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 my-auto max-h-[94vh] flex flex-col border border-slate-200 printable-container print-modal-content print:border-none print:shadow-none print:max-h-none print:overflow-visible">
        {/* Modern Header Banner */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex justify-between items-start flex-shrink-0 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
            {/* Student Avatar */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center text-white text-xl sm:text-2xl font-black flex-shrink-0 overflow-hidden shadow-lg relative">
              <span className="text-xl sm:text-2xl font-black">{student.name ? student.name.charAt(0).toUpperCase() : 'S'}</span>
              {photoUrl && (
                <img 
                  src={getGoogleDriveDirectImageUrl(photoUrl)} 
                  alt={student.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { 
                    const imgEl = e.currentTarget;
                    const driveId = photoUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] || photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
                    if (driveId && !imgEl.dataset.retried) {
                      imgEl.dataset.retried = 'true';
                      imgEl.src = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
                    } else {
                      imgEl.style.display = 'none';
                    }
                  }}
                />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] sm:text-[11px] font-black tracking-wide">
                  {formatClassLabel(student.class, true)}
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  NIS: {student.nis || '-'} • NISN: {student.nisn || '-'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-[10px] font-bold">
                  Kondisi: {student.statusYatim || 'Lengkap'}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black mt-1 tracking-tight text-white">
                {student.name}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300/90 mt-0.5">
                Ayah: <span className="text-white font-semibold">{student.namaAyah || '-'}</span> ({ayahDead ? 'Almarhum' : 'Masih Hidup'}) • Ibu: <span className="text-white font-semibold">{student.namaIbu || '-'}</span> ({ibuDead ? 'Almarhumah' : 'Masih Hidup'})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 border border-white/10 relative z-10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Completeness Status Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border shadow-xs",
              stats.isComplete 
                ? "bg-emerald-100 border-emerald-200 text-emerald-800" 
                : "bg-amber-100 border-amber-300 text-amber-900"
            )}>
              {stats.percent}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Status Validasi:
                </span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-black border",
                  stats.isComplete 
                    ? "bg-emerald-100 border-emerald-300 text-emerald-800" 
                    : "bg-amber-100 border-amber-300 text-amber-900"
                )}>
                  {stats.isComplete ? 'SEMUA BERKAS WAJIB TERPENUHI' : `KURANG ${stats.missingRequiredCount} BERKAS WAJIB`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {stats.requiredUploaded} dari {stats.requiredTotal} berkas wajib terunggah • Total berkas tersimpan: <strong className="text-slate-800">{stats.uploadedCount} berkas</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingCustomDoc(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <PlusCircle size={14} />
              <span>+ Berkas Lainnya</span>
            </button>

            <button
              onClick={() => triggerPrint()}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer size={13} />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>

        {/* Category Filter & Search Inside Modal */}
        <div className="p-4 px-6 bg-white border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTabCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95",
                  activeTabCategory === cat.id 
                    ? "bg-slate-900 text-white shadow-xs" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Cari jenis dokumen..."
              value={docSearchTerm}
              onChange={(e) => setDocSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Document Grid Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* STANDARD 16 DOCUMENTS */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {filteredDocs.map(doc => {
                const currentVal = getStudentDocValue(student, doc.key);
                const isPresent = Boolean(currentVal && currentVal.trim() !== '');
                const req = getStudentDocRequirement(String(doc.key), student);
                const isBusy = isUploading === doc.key;
                const currentMode = activeUrlTab[String(doc.key)] || 'file';

                return (
                  <div 
                    key={doc.key}
                    className={cn(
                      "p-4 rounded-2xl border transition-all duration-200 space-y-3 shadow-2xs hover:shadow-xs",
                      isPresent 
                        ? "bg-white border-emerald-200/90" 
                        : req.required 
                          ? "bg-amber-50/70 border-amber-300" 
                          : "bg-white border-slate-200/80"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-900 text-xs">
                            {doc.label}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border",
                            req.badgeType === 'mandatory'
                              ? "bg-rose-100 border-rose-200 text-rose-700"
                              : req.required
                                ? "bg-amber-100 border-amber-300 text-amber-800"
                                : "bg-slate-100 border-slate-200 text-slate-600"
                          )}>
                            {req.ruleLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-1">
                          {req.reason}
                        </p>
                      </div>

                      {isPresent ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 flex-shrink-0">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Ada</span>
                        </span>
                      ) : (
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 flex-shrink-0 border",
                          req.required 
                            ? "bg-amber-100 border-amber-300 text-amber-800" 
                            : "bg-slate-100 border-slate-200 text-slate-500"
                        )}>
                          <AlertCircle size={11} />
                          <span>{req.required ? 'Belum Ada' : 'Opsional'}</span>
                        </span>
                      )}
                    </div>

                    {/* Content & Action Area */}
                    {isPresent ? (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              Berkas Tersimpan
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {currentVal?.startsWith('data:') ? 'Tersimpan di Sistem (Base64)' : currentVal}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => onPreviewDoc({ title: doc.label, url: currentVal, studentName: student.name })}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition shadow-2xs"
                            title="Lihat Berkas"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {!currentVal?.startsWith('data:') && (
                            <a
                              href={currentVal}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-2xs"
                              title="Buka di Tab Google Drive"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}

                          <button
                            onClick={() => handleRemoveDoc(doc)}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 transition shadow-2xs"
                            title="Hapus Berkas Ini"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Mode Selector */}
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <div className="flex gap-2.5">
                            <button
                              type="button"
                              onClick={() => setActiveUrlTab(prev => ({ ...prev, [String(doc.key)]: 'file' }))}
                              className={cn("transition pb-0.5", currentMode === 'file' ? "text-amber-700 border-b-2 border-amber-600 font-black" : "hover:text-slate-800")}
                            >
                              Upload File (PDF / Foto)
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveUrlTab(prev => ({ ...prev, [String(doc.key)]: 'link' }))}
                              className={cn("transition pb-0.5", currentMode === 'link' ? "text-amber-700 border-b-2 border-amber-600 font-black" : "hover:text-slate-800")}
                            >
                              Link Google Drive
                            </button>
                          </div>
                        </div>

                        {currentMode === 'file' ? (
                          <div>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              ref={el => { fileInputRefs.current[String(doc.key)] = el; }}
                              onChange={(e) => handleFileUpload(doc, e)}
                              className="hidden"
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => fileInputRefs.current[String(doc.key)]?.click()}
                              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 shadow-2xs"
                            >
                              {isBusy ? (
                                <>
                                  <RefreshCw size={14} className="animate-spin text-amber-600" />
                                  <span>Mengunggah ke GDrive...</span>
                                </>
                              ) : (
                                <>
                                  <CloudUpload size={14} className="text-amber-600" />
                                  <span>Pilih File PDF / Foto</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="https://drive.google.com/file/d/..."
                              value={manualUrlInput[String(doc.key)] || ''}
                              onChange={(e) => setManualUrlInput(prev => ({ ...prev, [String(doc.key)]: e.target.value }))}
                              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveManualUrl(doc)}
                              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95"
                            >
                              Simpan
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CUSTOM DOCUMENTS SECTION */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Layers size={15} className="text-purple-600" />
                  <span>Berkas Tambahan Lainnya (Fleksibel)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lampiran sertifikat lomba, piagam, surat dokter, berkas asuransi / BPJS, dll.
                </p>
              </div>

              {!isAddingCustomDoc && (
                <button
                  onClick={() => setIsAddingCustomDoc(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <PlusCircle size={13} />
                  <span>Tambah Berkas</span>
                </button>
              )}
            </div>

            {/* Form Add Custom Doc */}
            {isAddingCustomDoc && (
              <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-purple-900">
                    Tambah Berkas Tambahan Baru
                  </h4>
                  <button
                    onClick={() => setIsAddingCustomDoc(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nama Berkas / Dokumen *
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: Piagam Juara 1 OSN / Surat Dokter / Kartu BPJS"
                      value={customDocName}
                      onChange={(e) => setCustomDocName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Kategori Berkas
                    </label>
                    <select
                      value={customDocCategory}
                      onChange={(e) => setCustomDocCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    >
                      <option value="Prestasi & Piagam">🏆 Prestasi & Piagam</option>
                      <option value="Kesehatan / Medis">🩺 Kesehatan / Surat Dokter</option>
                      <option value="Bantuan Sosial / KIP">💳 Bantuan Sosial / Asuransi</option>
                      <option value="Pendidikan Keagamaan">📖 Ijazah TPQ / Madrasah</option>
                      <option value="Berkas Tambahan">📁 Berkas Tambahan Umum</option>
                    </select>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="space-y-2">
                  <div className="flex gap-3 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCustomDocMode('file')}
                      className={cn("pb-1", customDocMode === 'file' ? "text-purple-700 border-b-2 border-purple-600" : "text-slate-500")}
                    >
                      Upload File (PDF/Foto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDocMode('link')}
                      className={cn("pb-1", customDocMode === 'link' ? "text-purple-700 border-b-2 border-purple-600" : "text-slate-500")}
                    >
                      Input Link Google Drive
                    </button>
                  </div>

                  {customDocMode === 'file' ? (
                    <div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        ref={customDocFileInputRef}
                        onChange={handleCustomDocFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isCustomDocUploading}
                        onClick={() => customDocFileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-purple-300 hover:border-purple-500 bg-white text-purple-800 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                      >
                        {isCustomDocUploading ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-purple-600" />
                            <span>Mengunggah berkas ke Google Drive...</span>
                          </>
                        ) : (
                          <>
                            <CloudUpload size={14} className="text-purple-600" />
                            <span>Pilih File PDF / Foto untuk Disimpan</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        value={customDocUrl}
                        onChange={(e) => setCustomDocUrl(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomDocLink}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95"
                      >
                        Simpan Berkas
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Docs List */}
            <div className="mt-3">
              {customDocsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customDocsList.map(cd => (
                    <div 
                      key={cd.id}
                      className="p-3 bg-white rounded-2xl border border-purple-200/90 shadow-2xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {cd.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {cd.category || 'Berkas Tambahan'} • {cd.uploadDate || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => onPreviewDoc({ title: cd.name, url: cd.url, studentName: student.name })}
                          className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-purple-600 hover:bg-purple-50 transition"
                          title="Lihat Berkas"
                        >
                          <Eye size={14} />
                        </button>

                        {!cd.url?.startsWith('data:') && (
                          <a
                            href={cd.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            title="Buka Link Asli"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}

                        <button
                          onClick={() => handleDeleteCustomDoc(cd.id, cd.name)}
                          className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus Berkas"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic bg-white p-4 rounded-2xl text-center border border-dashed border-slate-200">
                  Belum ada berkas tambahan khusus untuk siswa ini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-white border-t border-slate-200 flex justify-end items-center flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition active:scale-95 shadow-md"
          >
            Selesai & Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
