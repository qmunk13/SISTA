import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
  count?: number;
  highlight?: boolean;
}

interface CustomDropdownProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  icon?: React.ReactNode;
}

export default function CustomDropdown({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  searchable = false,
  disabled = false,
  className = '',
  buttonClassName = '',
  icon
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpwards: boolean;
  } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Synchronously calculate coordinates relative to viewport
  const calculateCoords = useCallback(() => {
    if (!buttonRef.current) return null;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const isUpwards = spaceBelow < 260 && spaceAbove > 200;

    const minWidth = Math.max(rect.width, 220);
    let left = rect.left;
    if (left + minWidth > window.innerWidth - 12) {
      left = Math.max(8, window.innerWidth - minWidth - 12);
    }

    return {
      top: isUpwards ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(8, left),
      width: minWidth,
      openUpwards: isUpwards
    };
  }, []);

  // Recalculate on scroll, resize, or viewport changes
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      const next = calculateCoords();
      if (next) {
        setCoords(prev => {
          if (
            prev &&
            prev.top === next.top &&
            prev.left === next.left &&
            prev.width === next.width &&
            prev.openUpwards === next.openUpwards
          ) {
            return prev;
          }
          return next;
        });
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, calculateCoords]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (!isOpen) {
      // Synchronously compute position BEFORE opening so there is zero position glitch
      const initialCoords = calculateCoords();
      if (initialCoords) {
        setCoords(initialCoords);
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;

      setIsOpen(false);
      setSearchQuery('');
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen && (searchable || options.length > 7) && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable, options.length]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find(
    opt => String(opt.value).trim().toLowerCase() === String(value).trim().toLowerCase()
  ) || options.find(opt => opt.value === value);

  // Filter options if searching
  const filteredOptions = options.filter(opt => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return opt.label.toLowerCase().includes(q) || String(opt.value).toLowerCase().includes(q);
  });

  const handleSelect = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const menuDropdown = isOpen && coords && typeof document !== 'undefined' ? createPortal(
    <div
      ref={menuRef}
      id={id ? `${id}-portal-menu` : undefined}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        zIndex: 999999,
        transform: coords.openUpwards ? 'translateY(-100%)' : 'none'
      }}
      className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-1 animate-in fade-in duration-100"
    >
      {/* Search Box */}
      {(searchable || options.length > 7) && (
        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari pilihan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
            />
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
        {filteredOptions.length === 0 ? (
          <div className="px-4 py-3 text-center text-xs text-slate-400 italic">
            Tidak ada pilihan ditemukan
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const isSelected = String(opt.value).trim().toLowerCase() === String(value).trim().toLowerCase() || opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => handleSelect(opt.value, e)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      isSelected ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {opt.badge}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative ${className}`} id={id}>
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        id={id ? `${id}-button` : undefined}
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100/90 rounded-xl p-2.5 font-bold text-slate-800 text-xs transition-all outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:hover:bg-slate-100 ${
          isOpen ? 'ring-2 ring-indigo-500 border-indigo-500 bg-white shadow-sm' : ''
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : <span className="text-slate-400 font-normal">{placeholder}</span>}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {/* Portal Dropdown Menu */}
      {menuDropdown}
    </div>
  );
}

export { CustomDropdown };
