import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSelector({ compact = false, disabled = false, onChange = null }) {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = async (code) => {
    if (code === language) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    if (onChange) {
      onChange(code);
    } else {
      await setLanguage(code, true);
    }
  };

  const currentLangObj = availableLanguages.find((l) => l.code === language) || availableLanguages[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Select preferred language"
        className={`inline-flex items-center gap-1.5 font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
          compact
            ? 'px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-2xs'
            : 'px-3 py-1.5 text-xs sm:text-sm bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Globe size={compact ? 13 : 15} className="text-teal-600 shrink-0" />
        <span className="truncate">{currentLangObj?.nativeName || 'हिन्दी'}</span>
        <ChevronDown size={compact ? 12 : 14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-48 sm:w-52 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 z-50 animate-in fade-in-50 zoom-in-95 duration-100 max-h-72 overflow-y-auto"
        >
          <div className="sticky top-0 bg-white px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider z-10">
            {language === 'hi' ? 'भाषा चुनें' : 'Select Language'}
          </div>
          <div className="py-1">
            {availableLanguages.map((l) => {
              const isSelected = l.code === language;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleSelect(l.code)}
                  className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-teal-50 text-teal-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                  role="menuitem"
                >
                  <div className="flex flex-col">
                    <span className="leading-tight">{l.nativeName}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{l.name}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-teal-600 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
