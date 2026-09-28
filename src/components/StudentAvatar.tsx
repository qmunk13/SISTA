import React, { useState } from 'react';

interface StudentAvatarProps {
  name: string;
  photoUrl?: string;
  gender?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const COLOR_PALETTES = [
  'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/50',
  'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700/50',
  'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700/50',
  'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950/80 dark:text-violet-300 dark:border-violet-700/50',
  'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/50',
  'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/50',
  'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-700/50',
  'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700/50',
];

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % COLOR_PALETTES.length;
}

export function normalizePhotoUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed.toLowerCase() === 'none'
  ) {
    return '';
  }

  // Filter out dummy stock photos from Unsplash (which show the stranger adult model on all students)
  if (
    trimmed.includes('images.unsplash.com') ||
    trimmed.includes('photo-1507003211169') ||
    trimmed.includes('photo-1534528741775') ||
    trimmed.includes('photo-1539571696357') ||
    trimmed.includes('photo-1517841905240') ||
    trimmed.includes('photo-1524504388940') ||
    trimmed.includes('photo-1500648767791') ||
    trimmed.includes('photo-1494790108377') ||
    trimmed.includes('photo-1519085360753')
  ) {
    return '';
  }

  // Google Drive link handling
  // Supports formats:
  // https://drive.google.com/file/d/FILE_ID/view...
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  // https://docs.google.com/uc?id=FILE_ID
  const gdMatch1 = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdMatch1 && gdMatch1[1]) {
    return `https://lh3.googleusercontent.com/d/${gdMatch1[1]}`;
  }
  const gdMatch2 = trimmed.match(/[drive|docs]\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (gdMatch2 && gdMatch2[1]) {
    return `https://lh3.googleusercontent.com/d/${gdMatch2[1]}`;
  }

  // Dropbox link handling
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  return trimmed;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  name,
  photoUrl,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const resolvedUrl = normalizePhotoUrl(photoUrl);
  const showImage = Boolean(resolvedUrl) && !imageError;

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base font-black',
  }[size];

  if (showImage) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setImageError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-slate-300 dark:border-slate-700 shadow-xs shrink-0 ${className}`}
      />
    );
  }

  const initials = getInitials(name);
  const colorClass = COLOR_PALETTES[getColorIndex(name)];

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold tracking-tight border shadow-xs shrink-0 select-none ${colorClass} ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};

