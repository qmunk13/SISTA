import React from 'react';
import { Student } from '../../types';
import { 
  STUDENT_DOC_CONFIGS, 
  getStudentCompleteness, 
  getStudentDocRequirement, 
  getStudentDocValue,
  isAyahDeceased,
  isIbuDeceased
} from '../../lib/berkasRules';
import { 
  cn, 
  formatClassLabel, 
  getGoogleDriveDirectImageUrl 
} from '../../lib/utils';
import { 
  CheckCircle2, 
  AlertCircle, 
  CloudUpload, 
  Check, 
  FileText,
  User,
  HeartHandshake
} from 'lucide-react';

interface BerkasStudentCardProps {
  student: Student;
  onOpenVault: (student: Student) => void;
  onPreviewDoc: (preview: { title: string; url: string; studentName: string }) => void;
}

export default function BerkasStudentCard({
  student,
  onOpenVault,
  onPreviewDoc
}: BerkasStudentCardProps) {
  const stats = getStudentCompleteness(student);
  const customDocsList = Array.isArray(student.customDocs) ? student.customDocs : [];
  const photoUrl = getStudentDocValue(student, 'fotoUrl') || student.fotoUrl || student.pasFoto || (student as any).PasFoto || (student as any).foto;
  
  const ayahDead = isAyahDeceased(student);
  const ibuDead = isIbuDeceased(student);
  const isOrphan = ayahDead || ibuDead;

  // SVG Radial Progress Calculation
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.percent / 100) * circumference;

  return (
    <div 
      className={cn(
        "group relative bg-white rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden",
        stats.isComplete 
          ? "border-emerald-200/90 hover:border-emerald-400/80 bg-gradient-to-b from-white to-emerald-50/20" 
          : "border-slate-200/90 hover:border-amber-400/80 bg-gradient-to-b from-white to-amber-50/20"
      )}
    >
      {/* Top Accent Line */}
      <div 
        className={cn(
          "h-1.5 w-full transition-all",
          stats.isComplete ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
        )}
      />

      <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
        {/* Profile Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Student Avatar with Status Ring */}
            <div className="relative flex-shrink-0">
              <div className={cn(
                "w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black text-sm overflow-hidden shadow-xs relative",
                stats.isComplete ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"
              )}>
                <span className="text-xs font-black">{student.name ? student.name.charAt(0).toUpperCase() : 'S'}</span>
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
              <span className={cn(
                "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black z-10",
                student.gender === 'L' ? "bg-blue-600 text-white" : "bg-pink-500 text-white"
              )}>
                {student.gender === 'L' ? 'L' : 'P'}
              </span>
            </div>

            {/* Name & NIS */}
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-slate-900 text-sm leading-snug truncate group-hover:text-amber-700 transition-colors">
                {student.name}
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 font-extrabold text-[10px]">
                  {formatClassLabel(student.class, true)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  NIS: {student.nis || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Circular Progress Gauge */}
          <div className="relative flex items-center justify-center flex-shrink-0">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="4.5"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                className={cn(
                  "transition-all duration-700 ease-out",
                  stats.isComplete ? "stroke-emerald-500" : stats.percent > 50 ? "stroke-amber-500" : "stroke-rose-500"
                )}
                strokeWidth="4.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={cn("text-[11px] font-black leading-none", stats.isComplete ? "text-emerald-700" : "text-slate-800")}>
                {stats.percent}%
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Wajib</span>
            </div>
          </div>
        </div>

        {/* Family Condition Indicator */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          {isOrphan ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold">
              <HeartHandshake size={11} className="text-rose-500" />
              <span>{ayahDead && ibuDead ? 'Yatim Piatu' : ayahDead ? 'Yatim (Ayah Wafat)' : 'Piatu (Ibu Wafat)'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-medium">
              <User size={10} className="text-slate-400" />
              <span>Ortu Lengkap</span>
            </span>
          )}

          {stats.isComplete ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-black">
              <CheckCircle2 size={11} className="text-emerald-600" />
              <span>Lengkap Cerdas ({stats.uploadedCount}/{stats.totalPossible})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 font-black">
              <AlertCircle size={11} className="text-amber-600" />
              <span>Kurang {stats.missingRequiredCount} Wajib</span>
            </span>
          )}
        </div>

        {/* 16 Matrix Document Chips */}
        <div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1.5">
            <span>Matriks Berkas ({stats.uploadedCount} Terunggah)</span>
            <span className="text-slate-500 font-bold">{stats.requiredUploaded}/{stats.requiredTotal} Wajib</span>
          </div>
          
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
            {STUDENT_DOC_CONFIGS.map(doc => {
              const val = getStudentDocValue(student, doc.key);
              const isPresent = Boolean(val && val.trim() !== '');
              const req = getStudentDocRequirement(String(doc.key), student);

              return (
                <button
                  key={doc.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPresent) {
                      onPreviewDoc({ title: doc.label, url: val, studentName: student.name });
                    } else {
                      onOpenVault(student);
                    }
                  }}
                  className={cn(
                    "py-1.5 px-1 rounded-xl text-[9px] font-bold transition-all border flex flex-col items-center justify-center text-center active:scale-95 relative",
                    isPresent
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-2xs"
                      : req.required
                        ? "bg-amber-50/80 text-amber-900 border-amber-300 hover:bg-amber-100 font-extrabold"
                        : "bg-slate-50 text-slate-400 border-slate-200/60 hover:bg-slate-100 opacity-60"
                  )}
                  title={`${doc.label}: ${isPresent ? 'Sudah Ada (Klik Lihat)' : req.required ? 'Wajib Diunggah (Klik Kelola)' : 'Opsional'}`}
                >
                  <span className="flex items-center gap-0.5 truncate max-w-full">
                    {isPresent ? (
                      <Check size={10} className="text-emerald-600 stroke-[3]" />
                    ) : (
                      <span className={cn("w-1 h-1 rounded-full", req.required ? "bg-amber-500" : "bg-slate-300")} />
                    )}
                    <span className="truncate">{doc.shortLabel}</span>
                  </span>
                </button>
              );
            })}

            {/* Custom Docs Badge */}
            {customDocsList.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenVault(student);
                }}
                className="py-1.5 px-1 rounded-xl text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center justify-center gap-0.5"
                title={`${customDocsList.length} Berkas Tambahan Lainnya`}
              >
                <FileText size={9} />
                <span>+{customDocsList.length} Lain</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-3.5 sm:p-4 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2">
        <button
          onClick={() => onOpenVault(student)}
          className={cn(
            "w-full py-2.5 px-4 rounded-2xl text-xs font-black transition-all active:scale-95 border flex items-center justify-center gap-2 shadow-xs",
            stats.isComplete 
              ? "bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-slate-900/10" 
              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-amber-600 shadow-amber-500/20"
          )}
        >
          <CloudUpload size={14} />
          <span>{stats.isComplete ? 'Buka Lemari Berkas' : 'Lengkapi Berkas Sekarang'}</span>
        </button>
      </div>
    </div>
  );
}
