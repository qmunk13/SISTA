import React from 'react';
import defaultLogoImg from '../assets/images/logo-rombel.png';

interface LogoRombelProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

export const LogoRombel: React.FC<LogoRombelProps> = ({
  className = 'w-10 h-10',
  size,
  alt = 'Logo Rombongan Belajar Karang Taruna Kecamatan Tambora',
}) => {
  return (
    <img
      src={defaultLogoImg}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain select-none shrink-0 ${className}`}
      referrerPolicy="no-referrer"
      loading="eager"
    />
  );
};

