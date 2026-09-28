import React, { useState, useMemo } from 'react';
import { getGoogleDriveDirectImageUrl } from '../../lib/utils';
import { getStudentDocValue } from '../../lib/berkasRules';
import { Student } from '../../types';

export interface StudentPhotoProps {
  student?: Partial<Student> | any;
  photoUrl?: string;
  fotoUrl?: string;
  name?: string;
  gender?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full' | 'custom';
  shape?: 'circle' | 'rounded' | 'square' | 'portrait';
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
  badgeColor?: string;
  onClick?: () => void;
  alt?: string;
}

export function resolveStudentPhoto(student: any): string {
  if (!student) return '';
  const rawUrl = 
    getStudentDocValue(student, 'fotoUrl') || 
    student.fotoUrl || 
    student.pasFoto || 
    student.PasFoto || 
    student.foto || 
    student.Foto || 
    student.photo || 
    student.Photo || 
    student.foto_url || 
    student.pas_foto || 
    student.avatar || 
    student.linkFoto || 
    student.LinkFoto || 
    '';
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  return getGoogleDriveDirectImageUrl(rawUrl.trim());
}

export default function StudentPhoto({
  student,
  photoUrl,
  fotoUrl,
  name,
  gender,
  size = 'md',
  shape = 'circle',
  className = '',
  showBadge = false,
  badgeText,
  badgeColor = 'bg-indigo-600',
  onClick,
  alt
}: StudentPhotoProps) {
  const [retrySecondary, setRetrySecondary] = useState(false);
  const [imgError, setImgError] = useState(false);

  const studentName = name || student?.name || 'Siswa';
  const studentGender = gender || student?.gender || (student as any)?.JenisKelamin || 'L';
  const effectivePhotoUrl = photoUrl || fotoUrl;
  
  const resolvedUrl = useMemo(() => {
    let base = '';
    if (effectivePhotoUrl) base = getGoogleDriveDirectImageUrl(effectivePhotoUrl);
    else if (student) base = resolveStudentPhoto(student);
    if (!base) return '';

    if (retrySecondary && base.includes('googleusercontent.com/d/')) {
      const idMatch = base.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w500`;
      }
    }
    return base;
  }, [student, effectivePhotoUrl, retrySecondary]);

  const sizeClasses: Record<string, string> = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
    '2xl': 'w-24 h-24 text-xl',
    '3xl': 'w-32 h-32 text-2xl',
    '4xl': 'w-48 h-48 text-4xl',
    'full': 'w-full h-full text-4xl',
    'custom': ''
  };

  const shapeClasses: Record<string, string> = {
    circle: 'rounded-full',
    rounded: 'rounded-2xl',
    square: 'rounded-none',
    portrait: 'rounded-2xl aspect-[3/4]'
  };

  const currentSizeClass = size === 'custom' || size === 'full' ? 'w-full h-full' : sizeClasses[size] || sizeClasses.md;
  const currentShapeClass = shapeClasses[shape] || shapeClasses.circle;

  const initial = studentName.trim() ? studentName.trim().charAt(0).toUpperCase() : 'S';
  const isFemale = String(studentGender).toUpperCase().startsWith('P');
  const gradientColor = isFemale 
    ? 'from-pink-500 to-rose-600' 
    : 'from-indigo-600 to-sky-700';

  return (
    <div 
      onClick={onClick}
      className={`relative inline-flex items-center justify-center flex-shrink-0 overflow-hidden select-none ${className}`}
    >
      {resolvedUrl && !imgError ? (
        <img
          src={resolvedUrl}
          alt={alt || studentName}
          className={`${currentSizeClass} ${currentShapeClass} object-cover border border-slate-200/80 shadow-xs bg-slate-100 flex-shrink-0`}
          referrerPolicy="no-referrer"
          onError={() => {
            if (!retrySecondary) {
              setRetrySecondary(true);
            } else {
              setImgError(true);
            }
          }}
        />
      ) : (
        <div
          className={`${currentSizeClass} ${currentShapeClass} bg-gradient-to-br ${gradientColor} text-white font-black flex items-center justify-center flex-shrink-0 shadow-xs border border-white/40`}
          title={studentName}
        >
          {initial}
        </div>
      )}

      {showBadge && (
        <span className={`absolute bottom-0 right-0 px-1.5 py-0.5 rounded-full text-[9px] font-black text-white ${badgeColor} ring-2 ring-white shadow-2xs z-10`}>
          {badgeText || (isFemale ? 'P' : 'L')}
        </span>
      )}
    </div>
  );
}
