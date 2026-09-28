import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  RefreshCw, 
  FileText, 
  User, 
  Users, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  FileCheck, 
  Layers,
  Wand2,
  Check
} from 'lucide-react';
import { TableSchema } from '../../data/masterDatabase60';
import { validateField, isValueEmpty, FieldAuditIssue } from '../../utils/intelligentAudit';

interface RecordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableSchema: TableSchema;
  initialData: Record<string, any>;
  recordId: string;
  onSave: (updatedRecord: Record<string, any>) => void;
}

export default function RecordEditorModal({
  isOpen,
  onClose,
  tableSchema,
  initialData,
  recordId,
  onSave
}: RecordEditorModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeGroupTab, setActiveGroupTab] = useState<string>('all');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data on open
  useEffect(() => {
    if (isOpen) {
      const cloned: Record<string, any> = { ...initialData };
      // Ensure all schema headers exist in state
      tableSchema.headers.forEach(h => {
        if (cloned[h] === undefined) {
          // Look for case-insensitive match
          const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const k of Object.keys(cloned)) {
            if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanH) {
              cloned[h] = cloned[k];
              break;
            }
          }
          if (cloned[h] === undefined) {
            cloned[h] = '';
          }
        }
      });
      setFormData(cloned);
      setSaveSuccessNotice(false);
    }
  }, [isOpen, initialData, tableSchema]);

  // Live validation calculations for all headers
  const liveValidations = useMemo(() => {
    const map = new Map<string, { isValid: boolean; issueType?: 'empty' | 'invalid' | 'warning'; message?: string; suggestion?: string }>();
    tableSchema.headers.forEach(header => {
      const val = formData[header];
      const res = validateField(header, val, formData, tableSchema.name);
      map.set(header, res);
    });
    return map;
  }, [formData, tableSchema]);

  // Calculate live health score of this record
  const currentRecordStats = useMemo(() => {
    let emptyCount = 0;
    let invalidCount = 0;
    let validCount = 0;

    tableSchema.headers.forEach(h => {
      const v = liveValidations.get(h);
      if (v) {
        if (!v.isValid) {
          if (v.issueType === 'empty') emptyCount++;
          else if (v.issueType === 'invalid') invalidCount++;
        } else {
          validCount++;
        }
      }
    });

    const total = tableSchema.headers.length || 1;
    const score = Math.round((validCount / total) * 100);
    return { emptyCount, invalidCount, validCount, total, score };
  }, [liveValidations, tableSchema]);

  // Dynamic Tabs / Groups for large tables (like SISWA)
  const headerGroups = useMemo(() => {
    if (tableSchema.name.toUpperCase() === 'SISWA') {
      return [
        { id: 'all', label: `Semua Kolom (${tableSchema.headers.length})`, icon: Layers },
        { 
          id: 'pokok', 
          label: 'Data Pokok & Pribadi', 
          icon: User,
          headers: ['nopdkt', 'NISN', 'NamaLengkap', 'JenisKelamin', 'Tempat Lahir', 'TanggalLahir', 'NIK', 'Agama', 'Golongan Darah', 'TinggiBadan(cm)', 'BeratBadan(kg)', 'Anak ke', 'Saudara', 'KelasSaatini', 'Status', 'TahunMasuk']
        },
        { 
          id: 'ortu', 
          label: 'Orang Tua & Wali', 
          icon: Users,
          headers: ['NomorKartuKeluarga', 'NamaAyah', 'NIKAyah', 'TempatLahirAyah', 'TanggalLahirAyah', 'PendidikanAyah', 'PekerjaanAyah', 'PenghasilanAyah', 'TlpAyah', 'StatusAyah', 'NamaIbu', 'NIKIbu', 'TempatLahirIbu', 'TanggalLahirIbu', 'PendidikanIbu', 'PekerjaanIbu', 'PenghasilanIbu', 'TlpIbu', 'StatusIbu', 'StatusYatim', 'NamaWali', 'TempatLahirWali', 'TglLahirWali', 'PendidikanWali', 'PekerjaanWali', 'PenghasilanWali', 'Hubungan', 'Tlp.Wali']
        },
        { 
          id: 'alamat', 
          label: 'Alamat & Kontak', 
          icon: MapPin,
          headers: ['Alamat', 'RT', 'RW', 'Kelurahan', 'Kecamatan', 'Kota', 'Provinsi', 'KodePos', 'JenisTinggal', 'AlatTransportasi', 'NomorHP', 'E-Mail', 'AsalSekolah', 'SKHUN', 'PenerimaKPS']
        },
        { 
          id: 'berkas', 
          label: '12 Dokumen Digital', 
          icon: FileCheck,
          headers: ['PasFoto', 'AktaKelahiran', 'KartuKeluarga', 'KIA', 'KTPAyah', 'KTPIbu', 'Ijazah', 'KTPWali', 'Rapor', 'S.Pindah', 'SuKet', 'S.Domisili']
        }
      ];
    }

    if (tableSchema.headers.length > 12) {
      const half = Math.ceil(tableSchema.headers.length / 2);
      return [
        { id: 'all', label: `Semua Kolom (${tableSchema.headers.length})`, icon: Layers },
        { id: 'part1', label: 'Bagian Utama', icon: FileText, headers: tableSchema.headers.slice(0, half) },
        { id: 'part2', label: 'Bagian Lanjutan', icon: Layers, headers: tableSchema.headers.slice(half) }
      ];
    }

    return [{ id: 'all', label: `Semua Kolom (${tableSchema.headers.length})`, icon: Layers }];
  }, [tableSchema]);

  // Headers to display based on active group tab
  const displayedHeaders = useMemo(() => {
    if (activeGroupTab === 'all') return tableSchema.headers;
    const group = headerGroups.find(g => g.id === activeGroupTab);
    return group && group.headers ? group.headers : tableSchema.headers;
  }, [activeGroupTab, headerGroups, tableSchema]);

  // Handle Field Value Change
  const handleFieldChange = (header: string, val: string) => {
    setFormData(prev => ({
      ...prev,
      [header]: val
    }));
  };

  // Smart quick format helpers
  const handleQuickCleanNumber = (header: string) => {
    const cur = String(formData[header] || '');
    const cleaned = cur.replace(/\D/g, '');
    handleFieldChange(header, cleaned);
  };

  const handleQuickCapitalize = (header: string) => {
    const cur = String(formData[header] || '');
    const capitalized = cur.replace(/\b\w/g, l => l.toUpperCase());
    handleFieldChange(header, capitalized);
  };

  const handleAutoFixAllIssuesInRecord = () => {
    const updated = { ...formData };
    tableSchema.headers.forEach(h => {
      const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      let val = updated[h];
      if (val === undefined || val === null) val = '';
      const valStr = String(val).trim();

      // Fix NIK / NISN with dashes/spaces
      if (hClean.includes('nik') || hClean.includes('nisn') || hClean.includes('kk')) {
        if (valStr && /[^\d]/.test(valStr)) {
          updated[h] = valStr.replace(/\D/g, '');
        }
      }
      // Fix phone
      const isPhoneField =
        hClean === 'nohp' ||
        hClean === 'hp' ||
        hClean === 'telepon' ||
        hClean === 'telp' ||
        hClean === 'notelp' ||
        hClean === 'notelepon' ||
        hClean === 'phone' ||
        hClean === 'phonenumber' ||
        hClean === 'mobile' ||
        hClean === 'kontak' ||
        hClean === 'wa' ||
        hClean === 'nowa' ||
        hClean === 'whatsapp' ||
        hClean === 'nomorwa' ||
        hClean.endsWith('telepon') ||
        hClean.endsWith('notelp') ||
        hClean.endsWith('nohp') ||
        hClean.endsWith('nowa');

      if (isPhoneField) {
        if (valStr && /[^\d+]/.test(valStr)) {
          updated[h] = valStr.replace(/[^\d+]/g, '');
        }
      }
      // Fix Gender
      if (hClean === 'jeniskelamin' || hClean === 'jk' || hClean === 'gender') {
        if (valStr.toLowerCase().startsWith('p') || valStr.toLowerCase() === 'wanita') {
          updated[h] = 'P';
        } else if (valStr.toLowerCase().startsWith('l') || valStr.toLowerCase() === 'pria') {
          updated[h] = 'L';
        }
      }
      // Fix Default Agama if empty
      if (hClean === 'agama' && (!valStr || valStr === '-')) {
        updated[h] = 'Islam';
      }
      // Fix Default Status Yatim if empty
      if (hClean === 'statusyatim' && (!valStr || valStr === '-')) {
        updated[h] = 'Lengkap';
      }
    });

    setFormData(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onSave(formData);
      setIsSubmitting(false);
      setSaveSuccessNotice(true);
      setTimeout(() => {
        onClose();
      }, 700);
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-black shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  Sheet #{tableSchema.id}: {tableSchema.name}
                </span>
                <span className="text-xs text-slate-400">ID: {recordId}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate max-w-md">
                Koreksi & Edit Data: {String(formData.NamaLengkap || formData.Nama || formData.name || formData.NamaSiswa || recordId)}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Health Badge */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-700">
              <span className="text-xs text-slate-300 font-bold">Validitas:</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                currentRecordStats.score >= 90 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                currentRecordStats.score >= 70 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {currentRecordStats.score}%
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action & Stats Quick Ribbon */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 text-slate-600 font-bold">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 size={14} /> {currentRecordStats.validCount} Lengkap & Valid
            </span>
            {currentRecordStats.emptyCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle size={14} /> {currentRecordStats.emptyCount} Kosong
              </span>
            )}
            {currentRecordStats.invalidCount > 0 && (
              <span className="flex items-center gap-1 text-rose-600">
                <AlertOctagon size={14} /> {currentRecordStats.invalidCount} Invalid Format
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFixAllIssuesInRecord}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer text-xs"
              title="Perbaiki otomatis tanda baca dan format default"
            >
              <Wand2 size={13} />
              Koreksi Format Otomatis
            </button>
          </div>
        </div>

        {/* Group Tabs for Multi-Column Tables */}
        {headerGroups.length > 1 && (
          <div className="px-6 py-2 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto shrink-0">
            {headerGroups.map(group => {
              const Icon = group.icon;
              const isActive = activeGroupTab === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupTab(group.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={14} />
                  {group.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Success Notice Notification */}
        {saveSuccessNotice && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-black flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Data berhasil disimpan ke database dan diverifikasi ulang secara instan!
          </div>
        )}

        {/* Form Body - Scrollable Fields Grid */}
        <form id="record-edit-form" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedHeaders.map((header, idx) => {
              const val = formData[header] !== undefined && formData[header] !== null ? String(formData[header]) : '';
              const validation = liveValidations.get(header);
              const isInvalid = validation && !validation.isValid;
              const isPk = header.toLowerCase() === tableSchema.primaryKey.toLowerCase();
              const hClean = header.toLowerCase().replace(/[^a-z0-9]/g, '');

              // Detect input type
              const isDate = hClean.includes('tanggal') || hClean.includes('tgl') || hClean === 'dob' || hClean === 'tmt';
              const isGender = hClean === 'jeniskelamin' || hClean === 'jk' || hClean === 'gender';
              const isStatus = hClean === 'status' || hClean === 'statusaktif';
              const isStatusYatim = hClean === 'statusyatim';
              const isAgama = hClean === 'agama';
              const isNumber = hClean.includes('nik') || hClean.includes('nisn') || hClean.includes('kk') || hClean.includes('nohp') || hClean.includes('telepon') || hClean.includes('tlp') || hClean.includes('nominal') || hClean.includes('biaya') || hClean.includes('tarif');

              return (
                <div 
                  key={`${header}-${idx}`} 
                  className={`p-3.5 rounded-2xl border transition ${
                    isInvalid 
                      ? validation.issueType === 'invalid'
                        ? 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-300'
                        : 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>{header}</span>
                      {isPk && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                          Primary Key
                        </span>
                      )}
                    </label>

                    {/* Format Quick Cleaners */}
                    <div className="flex items-center gap-1">
                      {isNumber && val && /[^\d]/.test(val) && (
                        <button
                          type="button"
                          onClick={() => handleQuickCleanNumber(header)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer"
                          title="Hapus spasi / tanda hubung"
                        >
                          Hapus Simbol
                        </button>
                      )}
                      {!isNumber && val && (
                        <button
                          type="button"
                          onClick={() => handleQuickCapitalize(header)}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer"
                          title="Kapitalkan kata"
                        >
                          Aa
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Field Input Control */}
                  {isGender ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleFieldChange(header, 'L')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                          val.toUpperCase().startsWith('L') || val.toUpperCase() === 'LAKI-LAKI' || val.toUpperCase() === 'PRIA'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        L (Laki-laki)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldChange(header, 'P')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                          val.toUpperCase().startsWith('P') || val.toUpperCase() === 'PEREMPUAN' || val.toUpperCase() === 'WANITA'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        P (Perempuan)
                      </button>
                    </div>
                  ) : isStatusYatim ? (
                    <select
                      value={val}
                      onChange={(e) => handleFieldChange(header, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="Lengkap">Lengkap (Kedua Orang Tua Masih Hidup)</option>
                      <option value="Yatim">Yatim (Ayah Meninggal)</option>
                      <option value="Piatu">Piatu (Ibu Meninggal)</option>
                      <option value="Yatim Piatu">Yatim Piatu (Ayah & Ibu Meninggal)</option>
                    </select>
                  ) : isAgama ? (
                    <select
                      value={val}
                      onChange={(e) => handleFieldChange(header, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  ) : isStatus ? (
                    <select
                      value={val}
                      onChange={(e) => handleFieldChange(header, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Lulus">Lulus</option>
                      <option value="Pindah">Pindah / Mutasi</option>
                      <option value="Keluar">Keluar / DO</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  ) : isDate ? (
                    <input
                      type="date"
                      value={val}
                      onChange={(e) => handleFieldChange(header, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  ) : (
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleFieldChange(header, e.target.value)}
                      placeholder={`Masukkan ${header}...`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono placeholder:font-sans placeholder:font-normal"
                    />
                  )}

                  {/* Live Validation Guidance Message */}
                  {validation && !validation.isValid && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-bold">
                      {validation.issueType === 'invalid' ? (
                        <AlertOctagon size={13} className="text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className={validation.issueType === 'invalid' ? 'text-rose-700' : 'text-amber-700'}>
                        <span>{validation.message}</span>
                        {validation.suggestion && (
                          <span className="block font-normal text-[10.5px] opacity-90 mt-0.5">
                            💡 {validation.suggestion}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </form>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-bold hidden sm:block">
            Tekan <strong className="text-slate-800">Simpan Perubahan</strong> untuk memperbarui database secara real-time.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="record-edit-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Menyimpan Data...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Simpan Perubahan Database</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
