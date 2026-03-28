import React from 'react';
import { motion } from 'motion/react';

export const Hero = ({ t }: { t: any }) => {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-ink transition-colors duration-500">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=2070&auto=format&fit=crop" 
          alt="Misty Mountains" 
          className="w-full h-full object-cover opacity-60 grayscale"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-transparent to-ink/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <span className="text-paper/60 uppercase tracking-[0.5em] text-xs mb-6 block font-medium">
            {t.subtitle}
          </span>
          <h1 className="text-6xl md:text-9xl font-serif text-paper leading-tight mb-8 tracking-tighter">
            {t.title}
          </h1>
          <p className="text-paper/70 text-lg md:text-xl font-serif italic max-w-2xl mx-auto leading-relaxed">
            {t.quote} <br />
            <span className="text-sm not-italic uppercase tracking-widest mt-4 block opacity-50">
              {t.subquote}
            </span>
          </p>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-px h-16 bg-gradient-to-b from-paper/0 via-paper/50 to-paper/0" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-paper/40">{t.scroll}</span>
        </motion.div>
      </div>

      {/* Vertical Text Accents */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:block">
        <div className="writing-vertical-rl text-paper/20 font-serif text-sm tracking-[1em] uppercase">
          Natural Flow • 无为而治 • Balance
        </div>
      </div>
    </section>
  );
};
