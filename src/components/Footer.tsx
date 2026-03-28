import React from 'react';
import { DaoIcon } from './DaoIcon';

export const Footer = ({ t, onNavClick, onSubscribe }: { t: any; onNavClick: (item: string) => void; onSubscribe: () => void }) => {
  return (
    <footer className="bg-ink text-paper py-24 px-6 transition-colors duration-500">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <DaoIcon className="w-10 h-10 text-paper" />
            <span className="font-serif text-2xl tracking-widest uppercase">Dao Insight</span>
          </div>
          <p className="text-paper/50 text-sm max-w-md leading-relaxed font-serif italic">
            {t.quote} <br />
            {t.desc}
          </p>
        </div>
        
        <div>
          <h4 className="text-xs uppercase tracking-widest font-bold mb-6 text-paper/40">{t.columns[0]}</h4>
          <ul className="space-y-4 text-sm">
            {t.links[0].map((link: string) => (
              <li key={link}>
                <button onClick={() => onNavClick(link)} className="hover:text-moss transition-colors">
                  {link}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="text-xs uppercase tracking-widest font-bold mb-6 text-paper/40">{t.columns[1]}</h4>
          <ul className="space-y-4 text-sm">
            <li>
              <button onClick={onSubscribe} className="hover:text-moss transition-colors">
                {t.links[1][0]}
              </button>
            </li>
            <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-moss transition-colors">{t.links[1][1]}</a></li>
            <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-moss transition-colors">{t.links[1][2]}</a></li>
            <li><a href="mailto:contact@daoinsight.com" className="hover:text-moss transition-colors">{t.links[1][3]}</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-paper/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-paper/30">
        <span>{t.rights}</span>
        <span>Designed for the Modern Zen.</span>
      </div>
    </footer>
  );
};
