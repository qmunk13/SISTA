import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  RefreshCw, 
  FileSpreadsheet, 
  Sparkles, 
  AlertOctagon, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown, 
  ExternalLink,
  Layers,
  BarChart3,
  SlidersHorizontal,
  Info,
  Edit3,
  Wand2,
  Check,
  Save,
  Pencil
} from 'lucide-react';
import { useStore } from '../store';
import { MASTER_TABLES_60, TableSchema } from '../data/masterDatabase60';
import { 
  runComprehensiveSystemAudit, 
  GlobalAuditResult, 
  SheetAuditSummary, 
  RecordAuditResult,
  FieldAuditIssue,
  saveAndSyncTableRecord,
  getTableRecords
} from '../utils/intelligentAudit';
import RecordEditorModal from './audit/RecordEditorModal';

interface SmartSheetAuditorProps {
  onNavigateToTab?: (tabName: string) => void;
}

export default function SmartSheetAuditor({ onNavigateToTab }: SmartSheetAuditorProps) {
  const { students, teachers, settings, updateStudent, updateTeacher } = useStore();

  const [isScanning, setIsScanning] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [selectedSheetName, setSelectedSheetName] = useState<string>('SISWA');
  const [searchRecordQuery, setSearchRecordQuery] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState<'all' | 'empty' | 'invalid' | 'clean'>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<{
    schema: TableSchema;
    recordId: string;
    rawData: Record<string, any>;
  } | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Run initial or refreshed system audit
  const [auditResult, setAuditResult] = useState<GlobalAuditResult>(() => {
    return runComprehensiveSystemAudit(students, teachers);
  });

  // Re-run audit whenever store students or teachers change
  useEffect(() => {
    const result = runComprehensiveSystemAudit(students, teachers);
    setAuditResult(result);
  }, [students, teachers]);

  const handleRefreshAudit = () => {
    setIsScanning(true);
    setTimeout(() => {
      const result = runComprehensiveSystemAudit(students, teachers);
      setAuditResult(result);
      setIsScanning(false);
      showToast('Audit sistem database selesai diperbarui!');
    }, 350);
  };

  // Handle Saving Record from Modal
  const handleSaveRecord = (updatedRecord: Record<string, any>) => {
    if (!editingRecord) return;
    
    saveAndSyncTableRecord(
      editingRecord.schema.name,
      editingRecord.recordId,
      updatedRecord,
      students,
      teachers,
      updateStudent,
      updateTeacher
    );

    // Immediate audit refresh
    const refreshed = runComprehensiveSystemAudit(students, teachers);
    setAuditResult(refreshed);
    showToast(`Data pada Sheet '${editingRecord.schema.name}' berhasil disimpan & divalidasi ulang!`, 'success');
  };

  // Batch Auto-Fix for Current Sheet
  const handleBatchAutoFixCurrentSheet = () => {
    const currentSchema = MASTER_TABLES_60.find(t => t.name === selectedSheetName);
    if (!currentSchema) return;

    const liveRows = getTableRecords(currentSchema.name, students, teachers);
    if (liveRows.length === 0) {
      showToast('Tidak ada baris data pada sheet ini untuk diperbaiki.', 'info');
      return;
    }

    let fixCount = 0;
    liveRows.forEach((row: any) => {
      const updatedRow = { ...row };
      let changed = false;

      currentSchema.headers.forEach(h => {
        const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        let val = updatedRow[h];
        if (val === undefined || val === null) val = '';
        const valStr = String(val).trim();

        // Clean NIK / NISN with dashes/spaces
        if (hClean.includes('nik') || hClean.includes('nisn') || hClean.includes('kk')) {
          if (valStr && /[^\d]/.test(valStr)) {
            updatedRow[h] = valStr.replace(/\D/g, '');
            changed = true;
          }
        }
        // Normalize Gender
        if (hClean === 'jeniskelamin' || hClean === 'jk' || hClean === 'gender') {
          if (valStr.toLowerCase().startsWith('p') || valStr.toLowerCase() === 'wanita') {
            updatedRow[h] = 'P';
            changed = true;
          } else if (valStr.toLowerCase().startsWith('l') || valStr.toLowerCase() === 'pria') {
            updatedRow[h] = 'L';
            changed = true;
          }
        }
        // Normalize Status Yatim default
        if (hClean === 'statusyatim' && (!valStr || valStr === '-' || valStr === 'null')) {
          updatedRow[h] = 'Lengkap';
          changed = true;
        }
        // Normalize Agama default
        if (hClean === 'agama' && (!valStr || valStr === '-' || valStr === 'null')) {
          updatedRow[h] = 'Islam';
          changed = true;
        }
      });

      if (changed) {
        fixCount++;
        const pk = currentSchema.primaryKey || 'id';
        const recId = String(row[pk] || row.id || row.ID || row.nopdkt || row.nis || `ROW`);
        saveAndSyncTableRecord(
          currentSchema.name,
          recId,
          updatedRow,
          students,
          teachers,
          updateStudent,
          updateTeacher
        );
      }
    });

    const refreshed = runComprehensiveSystemAudit(students, teachers);
    setAuditResult(refreshed);
    showToast(`Otomasi selesai: ${fixCount} baris data berhasil distandarkan formatnya!`, 'success');
  };

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    MASTER_TABLES_60.forEach(t => cats.add(t.category));
    return ['all', ...Array.from(cats)];
  }, []);

  // Filtered sheets list
  const filteredSheets = useMemo(() => {
    return auditResult.sheetsSummary.filter(sheet => {
      if (activeCategoryFilter === 'all') return true;
      return sheet.category === activeCategoryFilter;
    });
  }, [auditResult, activeCategoryFilter]);

  // Active selected sheet summary
  const currentSheetSummary = useMemo(() => {
    return auditResult.sheetsSummary.find(s => s.tableName === selectedSheetName) || auditResult.sheetsSummary[0];
  }, [auditResult, selectedSheetName]);

  // Current selected table schema
  const currentTableSchema = useMemo(() => {
    return MASTER_TABLES_60.find(t => t.name === selectedSheetName) || MASTER_TABLES_60[0];
  }, [selectedSheetName]);

  // Filtered records within the selected sheet
  const filteredRecords = useMemo(() => {
    if (!currentSheetSummary) return [];
    return currentSheetSummary.allRecords.filter(rec => {
      // 1. Search Query
      const matchSearch = searchRecordQuery === '' ||
        rec.primaryValue.toLowerCase().includes(searchRecordQuery.toLowerCase()) ||
        rec.recordId.toLowerCase().includes(searchRecordQuery.toLowerCase()) ||
        rec.issues.some(i => i.field.toLowerCase().includes(searchRecordQuery.toLowerCase()) || i.message.toLowerCase().includes(searchRecordQuery.toLowerCase()));

      if (!matchSearch) return false;

      // 2. Issue Type Filter
      if (issueTypeFilter === 'all') return true;
      if (issueTypeFilter === 'clean') return rec.issues.length === 0;
      if (issueTypeFilter === 'empty') return rec.hasEmpty;
      if (issueTypeFilter === 'invalid') return rec.hasInvalid;

      return true;
    });
  }, [currentSheetSummary, searchRecordQuery, issueTypeFilter]);

  // Health color badge
  const getHealthBadge = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        bar: 'bg-emerald-500',
        text: 'Sangat Sehat & Valid',
        color: 'text-emerald-600'
      };
    }
    if (score >= 70) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        bar: 'bg-amber-500',
        text: 'Perlu Pengisian Tambahan',
        color: 'text-amber-600'
      };
    }
    return {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      bar: 'bg-rose-500',
      text: 'Banyak Kolom Kosong / Invalid',
      color: 'text-rose-600'
    };
  };

  const systemBadge = getHealthBadge(auditResult.overallSystemHealth);
  const currentSheetBadge = currentSheetSummary ? getHealthBadge(currentSheetSummary.overallHealthScore) : systemBadge;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-500/40 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 text-xs font-black">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-400" />
                Audit & Editor Cerdas {auditResult.totalSheetsScanned} Master Sheet
              </span>
              <span className="text-xs text-slate-400">Pembaruan: {auditResult.timestamp}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Inspektor Isian & Validitas Database
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Logika pintar otomatis yang memindai seluruh {auditResult.totalSheetsScanned} sheet Google Spreadsheet. Anda kini dapat <strong>langsung mengedit, mengoreksi, dan menyimpan perubahan data</strong> ke database secara terintegrasi!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefreshAudit}
              disabled={isScanning}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={16} className={isScanning ? "animate-spin" : ""} />
              <span>{isScanning ? 'Memindai Seluruh Sheet...' : 'Pindai Ulang Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kesehatan Data</span>
              <ShieldCheck size={18} className={systemBadge.color} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {auditResult.overallSystemHealth}%
            </div>
            <div className="w-full bg-slate-700/80 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className={`h-full ${systemBadge.bar}`} style={{ width: `${auditResult.overallSystemHealth}%` }} />
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sheet Terpindai</span>
              <FileSpreadsheet size={18} className="text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {auditResult.totalSheetsScanned}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{auditResult.totalSheetsScanned} Sheet Master Terstruktur</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Isian Kosong</span>
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {auditResult.totalEmptyFieldsFound.toLocaleString()}
            </div>
            <span className="text-[11px] text-amber-300/80 font-medium">Dapat diedit langsung dari sini</span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Format Tidak Valid</span>
              <AlertOctagon size={18} className="text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1">
              {auditResult.totalInvalidFieldsFound.toLocaleString()}
            </div>
            <span className="text-[11px] text-rose-300/80 font-medium">Gunakan tombol Koreksi / Edit</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Sheet Selector & Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Category Filter Pills */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-indigo-600" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Filter Kategori Sheet</h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">{filteredSheets.length} Sheet</span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeCategoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'Semua Kategori (60)' : cat.replace(/^\d+\.\s*/, '')}
                </button>
              ))}
            </div>
          </div>

          {/* Sheets List Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-indigo-600" />
                Daftar Sheet Spreadsheet
              </h3>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-2 space-y-1">
              {filteredSheets.map(sheet => {
                const isSelected = sheet.tableName === selectedSheetName;
                const hasProblems = sheet.emptyIssuesCount > 0 || sheet.invalidIssuesCount > 0;
                const health = getHealthBadge(sheet.overallHealthScore);

                return (
                  <button
                    key={sheet.tableName}
                    onClick={() => {
                      setSelectedSheetName(sheet.tableName);
                      setExpandedRecordId(null);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-indigo-50 border-2 border-indigo-500 shadow-sm' 
                        : 'hover:bg-slate-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-black flex items-center justify-center shrink-0">
                          {sheet.sheetNumber}
                        </span>
                        <span className={`font-black text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {sheet.tableName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        <span>{sheet.totalRecords} baris data</span>
                        <span>•</span>
                        <span>{sheet.headers.length} kolom</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${health.bg}`}>
                        {sheet.overallHealthScore}%
                      </span>
                      {hasProblems ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          {sheet.invalidIssuesCount > 0 && (
                            <span className="text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded font-black">
                              {sheet.invalidIssuesCount} invalid
                            </span>
                          )}
                          {sheet.emptyIssuesCount > 0 && (
                            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-bold">
                              {sheet.emptyIssuesCount} kosong
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 size={11} /> Bersih
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Sheet Audit & Record Inspector (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {currentSheetSummary && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              
              {/* Sheet Header Detail */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black">
                      Sheet #{currentSheetSummary.sheetNumber}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {currentSheetSummary.tableName}
                    </h2>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${currentSheetBadge.bg}`}>
                      {currentSheetSummary.overallHealthScore}% - {currentSheetBadge.text}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    {currentSheetSummary.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchAutoFixCurrentSheet}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-2xl text-xs border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Standarkan tanda baca NIK/NISN, status, dan data default untuk sheet ini"
                  >
                    <Wand2 size={14} className="text-emerald-600" />
                    <span>Koreksi Otomatis Sheet</span>
                  </button>
                </div>
              </div>

              {/* Critical Notice if issues found */}
              {currentSheetSummary.criticalIssueFields.length > 0 && (
                <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-black">Kolom yang paling banyak terdeteksi kosong / tidak valid pada sheet ini:</span>{' '}
                    <span className="font-bold underline">
                      {currentSheetSummary.criticalIssueFields.join(', ')}
                    </span>.
                    <div className="mt-1 text-amber-800">
                      Klik tombol <strong>Edit & Koreksi Data</strong> pada baris bersangkutan untuk langsung memperbaiki dan menyimpannya.
                    </div>
                  </div>
                </div>
              )}

              {/* Filters & Search for Records in this Sheet */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchRecordQuery}
                    onChange={(e) => setSearchRecordQuery(e.target.value)}
                    placeholder={`Cari baris data di sheet ${currentSheetSummary.tableName}...`}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setIssueTypeFilter('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      issueTypeFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua Baris ({currentSheetSummary.allRecords.length})
                  </button>
                  <button
                    onClick={() => setIssueTypeFilter('invalid')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                      issueTypeFilter === 'invalid'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <AlertOctagon size={13} />
                    Invalid ({currentSheetSummary.invalidIssuesCount})
                  </button>
                  <button
                    onClick={() => setIssueTypeFilter('empty')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                      issueTypeFilter === 'empty'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    <AlertTriangle size={13} />
                    Kosong ({currentSheetSummary.emptyIssuesCount})
                  </button>
                  <button
                    onClick={() => setIssueTypeFilter('clean')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                      issueTypeFilter === 'clean'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    Valid ({currentSheetSummary.validRecordsCount})
                  </button>
                </div>
              </div>

              {/* Records List Container */}
              <div className="space-y-3">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                    <h4 className="font-bold text-sm text-slate-800">Tidak Ada Isu Ditemukan</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Semua data pada kriteria filter ini sudah memenuhi standar format dan lengkap.
                    </p>
                  </div>
                ) : (
                  filteredRecords.map((rec, recIdx) => {
                    const rowUniqueKey = `${rec.tableName}-${rec.recordId}-${rec.rowNumber}-${recIdx}`;
                    const isExpanded = expandedRecordId === rowUniqueKey;
                    const hasIssues = rec.issues.length > 0;

                    return (
                      <div
                        key={rowUniqueKey}
                        className={`rounded-2xl border transition overflow-hidden ${
                          hasIssues 
                            ? 'border-slate-200 bg-white hover:border-slate-300' 
                            : 'border-emerald-200/80 bg-emerald-50/20'
                        }`}
                      >
                        {/* Record Item Header */}
                        <div className="p-4 flex items-center justify-between gap-3 select-none">
                          <div 
                            onClick={() => setExpandedRecordId(isExpanded ? null : rowUniqueKey)}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                              Baris #{rec.rowNumber}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-black text-sm text-slate-900 truncate">
                                {rec.primaryValue}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>ID: <code className="font-mono text-slate-700 font-bold">{rec.recordId}</code></span>
                                {rec.issues.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-rose-600 font-bold">
                                      {rec.issues.length} catatan perbaikan
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Direct Edit Button */}
                            <button
                              onClick={() => {
                                setEditingRecord({
                                  schema: currentTableSchema,
                                  recordId: rec.recordId,
                                  rawData: rec.rawData
                                });
                              }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-extrabold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                              title="Edit dan simpan langsung ke database"
                            >
                              <Pencil size={13} />
                              <span>Edit Data</span>
                            </button>

                            <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                              rec.score >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              rec.score >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {rec.score}%
                            </span>
                            
                            <button
                              onClick={() => setExpandedRecordId(isExpanded ? null : rowUniqueKey)}
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Issues Details */}
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-3">
                            <div className="flex items-center justify-between pt-3">
                              <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                Rincian Validasi Kolom:
                              </div>
                              <button
                                onClick={() => {
                                  setEditingRecord({
                                    schema: currentTableSchema,
                                    recordId: rec.recordId,
                                    rawData: rec.rawData
                                  });
                                }}
                                className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 size={13} />
                                Buka Form Editor Lengkap
                              </button>
                            </div>

                            {rec.issues.length === 0 ? (
                              <div className="py-2 text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                                <CheckCircle2 size={15} />
                                Seluruh kolom isian baris ini lengkap dan terformat secara valid!
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {rec.issues.map((issue, issueIdx) => (
                                  <div
                                    key={issueIdx}
                                    className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2.5 ${
                                      issue.issueType === 'invalid'
                                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                                        : 'bg-amber-50 border-amber-200 text-amber-900'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                      {issue.issueType === 'invalid' ? (
                                        <AlertOctagon size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                      ) : (
                                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                      )}

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-black text-slate-900 uppercase">
                                            [{issue.field}]
                                          </span>
                                          <span className="text-[11px] text-slate-500">
                                            Nilai saat ini: <code className="font-mono bg-white/80 px-1 rounded border border-slate-200 font-bold text-slate-800">{String(issue.value || '(Kosong)')}</code>
                                          </span>
                                        </div>

                                        <p className="mt-1 font-bold text-xs">
                                          {issue.message}
                                        </p>

                                        {issue.suggestion && (
                                          <p className="mt-0.5 text-[11px] opacity-85">
                                            💡 <strong>Saran Solusi:</strong> {issue.suggestion}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => {
                                        setEditingRecord({
                                          schema: currentTableSchema,
                                          recordId: rec.recordId,
                                          rawData: rec.rawData
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-[11px] rounded-lg border border-indigo-200 transition shrink-0 cursor-pointer shadow-2xs"
                                    >
                                      Koreksi Kolom Ini
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Interactive Record Editor Modal */}
      {editingRecord && (
        <RecordEditorModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          tableSchema={editingRecord.schema}
          initialData={editingRecord.rawData}
          recordId={editingRecord.recordId}
          onSave={handleSaveRecord}
        />
      )}
    </div>
  );
}

