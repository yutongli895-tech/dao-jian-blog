import React from 'react';
import { DaoIcon } from './DaoIcon';
import { motion } from 'motion/react';
import { Sun, Moon, Languages } from 'lucide-react';

interface NavbarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  lang: 'cn' | 'en';
  toggleLang: () => void;
  t: any;
  onNavClick: (item: string) => void;
  onSubscribe: () => void;
}

export const Navbar = ({ theme, toggleTheme, lang, toggleLang, t, onNavClick, onSubscribe }: NavbarProps) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center mist-blur border-b border-ink/5 transition-colors duration-500 text-ink">
      <div 
        className="flex items-center gap-3 group cursor-pointer"
        onClick={() => onNavClick(t.nav[0])}
      >
        <DaoIcon className="w-8 h-8 transition-transform duration-500 group-hover:rotate-180" />
        <span className="font-serif text-xl tracking-widest uppercase">Dao Insight</span>
      </div>
      
      <div className="hidden md:flex gap-8 text-sm uppercase tracking-widest font-medium">
        {t.nav.map((item: string) => (
          <button 
            key={item} 
            onClick={() => onNavClick(item)}
            className="hover:text-moss transition-colors relative group"
          >
            {item}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-moss transition-all duration-300 group-hover:w-full" />
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Language Toggle */}
        <button 
          onClick={toggleLang}
          className="p-2 hover:bg-ink/5 rounded-full transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter"
          title="Switch Language"
        >
          <Languages className="w-4 h-4" />
          <span>{lang === 'cn' ? 'EN' : '中'}</span>
        </button>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 hover:bg-ink/5 rounded-full transition-colors"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        <button 
          onClick={onSubscribe}
          className="hidden sm:block px-4 py-1.5 border border-ink text-xs uppercase tracking-widest hover:bg-ink hover:text-paper transition-all duration-300"
        >
          {t.subscribe}
        </button>
      </div>
    </nav>
  );
};
