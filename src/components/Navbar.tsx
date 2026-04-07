import React, { useState } from 'react';
import { DaoIcon } from './DaoIcon';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Languages, Menu, X } from 'lucide-react';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (item: string) => {
    onNavClick(item);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center mist-blur border-b border-ink/5 transition-colors duration-500 text-ink">
        <div 
          className="flex items-center gap-3 group cursor-pointer"
          onClick={() => handleNavClick(t.nav[0])}
        >
          <DaoIcon className="w-8 h-8 transition-transform duration-500 group-hover:rotate-180" />
          <span className="font-serif text-xl tracking-widest uppercase">Dao Insight</span>
        </div>
        
        <div className="hidden md:flex gap-8 text-sm uppercase tracking-widest font-medium">
          {t.nav.map((item: string) => (
            <button 
              key={item} 
              onClick={() => handleNavClick(item)}
              className="hover:text-moss transition-colors relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-moss transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
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

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-ink/5 rounded-full transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-paper pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-8">
              {t.nav.map((item: string) => (
                <button 
                  key={item} 
                  onClick={() => handleNavClick(item)}
                  className="text-2xl font-serif text-left border-b border-ink/5 pb-4"
                >
                  {item}
                </button>
              ))}
              <button 
                onClick={() => {
                  onSubscribe();
                  setIsMenuOpen(false);
                }}
                className="w-full py-4 border border-ink text-sm uppercase tracking-[0.2em] font-bold hover:bg-ink hover:text-paper transition-all"
              >
                {t.subscribe}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
