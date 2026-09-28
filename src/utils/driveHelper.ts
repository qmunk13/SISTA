import React from 'react';

export function formatGoogleDriveUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return url;
}

export function handleDriveImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl?: string) {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = fallbackUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600';
}
